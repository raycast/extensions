import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import YAML from "yaml";

export type TaskStatus = "open" | "done" | string;

export type TaskNote = {
  title: string;
  status: TaskStatus;
  completed: boolean;
  openStatus: string;
  doneStatus: string;
  path: string;
  vaultName: string;
  vaultPath: string;
  relativePath: string;
  body: string;
  frontmatter: Record<string, unknown>;
  due?: string;
  scheduled?: string;
  priority?: string;
  contexts: string[];
  projects: string[];
  tags: string[];
};

export type NewTaskValues = {
  vaultName?: string;
  title: string;
  details?: string;
  status?: string;
  priority?: string;
  due?: Date | string | null;
  scheduled?: Date | string | null;
  contexts?: string;
  projects?: string;
  tags?: string;
};

export type VaultInfo = {
  name: string;
  path: string;
  settings: TaskNotesSettings;
};

const markdownExtension = ".md";
const taskNotesSettingsPath = path.join(".obsidian", "plugins", "tasknotes", "data.json");
const defaultVaultStorageKey = "default-vault-name";

type FieldMapping = Record<string, string>;

type TaskCreationDefaults = {
  defaultContexts: string;
  defaultTags: string;
  defaultProjects: string;
  defaultTimeEstimate: number;
  defaultRecurrence: string;
  defaultDueDate: string;
  defaultScheduledDate: string;
};

type TaskNotesSettings = {
  tasksFolder: string;
  taskIdentificationMethod: "tag" | "property";
  taskTag: string;
  taskPropertyName?: string;
  taskPropertyValue?: string;
  storeTitleInFilename: boolean;
  taskFilenameFormat: "title" | "zettel" | "timestamp" | "custom";
  customFilenameTemplate: string;
  defaultTaskStatus: string;
  defaultTaskPriority: string;
  completedStatuses: string[];
  nlpDefaultToScheduled: boolean;
  fieldMapping: FieldMapping;
  taskCreationDefaults: TaskCreationDefaults;
};

const defaultFieldMapping: FieldMapping = {
  title: "title",
  status: "status",
  priority: "priority",
  due: "due",
  scheduled: "scheduled",
  contexts: "contexts",
  projects: "projects",
  timeEstimate: "timeEstimate",
  completedDate: "completedDate",
  dateCreated: "dateCreated",
  dateModified: "dateModified",
  recurrence: "recurrence",
  recurrenceAnchor: "recurrence_anchor",
  timeEntries: "timeEntries",
  completeInstances: "complete_instances",
  blockedBy: "blockedBy",
  reminders: "reminders",
};

const defaultTaskCreationDefaults: TaskCreationDefaults = {
  defaultContexts: "",
  defaultTags: "",
  defaultProjects: "",
  defaultTimeEstimate: 0,
  defaultRecurrence: "none",
  defaultDueDate: "none",
  defaultScheduledDate: "none",
};

export function preferences() {
  const values = getPreferenceValues<Preferences>();
  return {
    ...values,
    vaultPath: expandHome(values.vaultPath),
    vaultMode: values.vaultMode || "single",
    tasksFolder: trimSlashes(values.tasksFolder),
    storeTitleInFilename: values.storeTitleInFilename ?? true,
    filenameFormat: values.filenameFormat || "title",
    taskTag: stripHash(values.taskTag),
    taskPropertyName: values.taskPropertyName?.trim(),
    taskPropertyValue: values.taskPropertyValue?.trim(),
    showCompletedTasks: values.showCompletedTasks ?? true,
  };
}

export async function listTaskNotes(): Promise<TaskNote[]> {
  const vaults = await listVaults();
  const nestedTasks = await Promise.all(
    vaults.map(async (vault) => {
      const files = await listMarkdownFiles(vault.path);
      return Promise.all(files.map((file) => readTaskNote(file, vault)));
    }),
  );

  return nestedTasks
    .flat()
    .filter((task): task is TaskNote => Boolean(task))
    .sort((a, b) => {
      const aDone = a.completed ? 1 : 0;
      const bDone = b.completed ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return sortDate(a.due) - sortDate(b.due) || a.title.localeCompare(b.title);
    });
}

export async function createTaskNote(values: NewTaskValues): Promise<TaskNote> {
  const vault = await resolveVaultForCreate(values.vaultName);
  const settings = vault.settings;
  const title = values.title.trim();
  const now = new Date();
  const taskDirectory = path.join(vault.path, settings.tasksFolder);
  await mkdir(taskDirectory, { recursive: true });

  const contexts = listOrDefault(values.contexts, settings.taskCreationDefaults.defaultContexts).map(stripAt);
  const projects = await projectLinks(
    listOrDefault(values.projects, settings.taskCreationDefaults.defaultProjects),
    vault.path,
  );
  const tags = taskTags(values.tags, settings);
  const priority = values.priority || settings.defaultTaskPriority;
  const due = values.due ? formatDateValue(values.due) : defaultDateValue(settings.taskCreationDefaults.defaultDueDate);
  const scheduled = values.scheduled
    ? formatDateValue(values.scheduled)
    : defaultDateValue(settings.taskCreationDefaults.defaultScheduledDate);

  const frontmatter: Record<string, unknown> = {
    [field(settings, "status")]: values.status || settings.defaultTaskStatus,
    [field(settings, "dateCreated")]: formatDateTime(now),
    [field(settings, "dateModified")]: formatDateTime(now),
  };

  if (!settings.storeTitleInFilename) {
    frontmatter[field(settings, "title")] = title;
  }

  if (settings.taskIdentificationMethod === "property" && settings.taskPropertyName && settings.taskPropertyValue) {
    frontmatter[settings.taskPropertyName] = coercePreferenceValue(settings.taskPropertyValue);
  }

  if (tags.length > 0) frontmatter.tags = tags;
  if (priority) frontmatter[field(settings, "priority")] = priority;
  if (due) frontmatter[field(settings, "due")] = due;
  if (scheduled) frontmatter[field(settings, "scheduled")] = scheduled;
  if (contexts.length > 0) frontmatter[field(settings, "contexts")] = contexts;
  if (projects.length > 0) frontmatter[field(settings, "projects")] = projects;
  if (settings.taskCreationDefaults.defaultTimeEstimate > 0) {
    frontmatter[field(settings, "timeEstimate")] = settings.taskCreationDefaults.defaultTimeEstimate;
  }
  if (settings.taskCreationDefaults.defaultRecurrence && settings.taskCreationDefaults.defaultRecurrence !== "none") {
    frontmatter[field(settings, "recurrence")] = recurrenceValue(settings.taskCreationDefaults.defaultRecurrence);
  }

  const body = values.details?.trim() ? `${values.details.trim()}\n` : "";
  const filename = await availableFilename(
    taskDirectory,
    filenameStem({ title, priority, status: values.status, tags, contexts, projects }, settings, now),
  );
  const filePath = path.join(taskDirectory, filename);
  await writeTaskFile(filePath, frontmatter, body);

  const task = await readTaskNote(filePath, vault);
  if (!task) {
    throw new Error("Created task could not be read back from disk.");
  }

  return task;
}

export async function setTaskStatus(task: TaskNote, status: string): Promise<void> {
  const settings = await settingsForTask(task);
  const frontmatter: Record<string, unknown> = {
    ...task.frontmatter,
    [field(settings, "status")]: status,
    [field(settings, "dateModified")]: formatDateTime(new Date()),
  };

  if (settings.completedStatuses.includes(status)) {
    frontmatter[field(settings, "completedDate")] = formatDate(new Date());
  } else {
    delete frontmatter[field(settings, "completedDate")];
  }

  await writeTaskFile(task.path, frontmatter, task.body);
}

export function obsidianUrl(task: TaskNote): string {
  const fileWithoutExtension = task.relativePath.replace(/\.md$/i, "");
  return `obsidian://open?vault=${encodeURIComponent(task.vaultName)}&file=${encodeURIComponent(fileWithoutExtension)}`;
}

export function taskSubtitle(task: TaskNote): string | undefined {
  const parts = [
    task.status,
    task.priority,
    task.contexts.length > 0 ? task.contexts.map((context) => `@${context}`).join(" ") : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : undefined;
}

async function readTaskNote(filePath: string, vault: VaultInfo): Promise<TaskNote | undefined> {
  const raw = await readFile(filePath, "utf8");
  const parsed = parseMarkdown(raw);
  if (!parsed) return undefined;

  const settings = vault.settings;
  const tags = normalizeArray(parsed.frontmatter.tags).map(stripHash);
  if (!isTaskNote(parsed.frontmatter, tags, settings)) return undefined;

  const title = stringValue(parsed.frontmatter[field(settings, "title")]) || path.basename(filePath, markdownExtension);
  const status = stringValue(parsed.frontmatter[field(settings, "status")]) || settings.defaultTaskStatus;

  return {
    title,
    status,
    completed: settings.completedStatuses.includes(status),
    openStatus: settings.defaultTaskStatus,
    doneStatus: settings.completedStatuses[0] || "done",
    path: filePath,
    vaultName: vault.name,
    vaultPath: vault.path,
    relativePath: path.relative(vault.path, filePath),
    body: parsed.body,
    frontmatter: parsed.frontmatter,
    due: dateValue(parsed.frontmatter[field(settings, "due")]),
    scheduled: dateValue(parsed.frontmatter[field(settings, "scheduled")]),
    priority: stringValue(parsed.frontmatter[field(settings, "priority")]),
    contexts: normalizeArray(parsed.frontmatter[field(settings, "contexts")]).map(stripAt),
    projects: normalizeArray(parsed.frontmatter[field(settings, "projects")]),
    tags,
  };
}

function parseMarkdown(raw: string): { frontmatter: Record<string, unknown>; body: string } | undefined {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return undefined;

  let frontmatter: unknown;
  try {
    frontmatter = YAML.parse(match[1]) ?? {};
  } catch {
    return undefined;
  }

  if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) return undefined;

  return {
    frontmatter: frontmatter as Record<string, unknown>,
    body: match[2] ?? "",
  };
}

async function writeTaskFile(filePath: string, frontmatter: Record<string, unknown>, body: string) {
  const yaml = YAML.stringify(frontmatter, {
    lineWidth: 0,
    sortMapEntries: false,
  }).trimEnd();

  await writeFile(filePath, `---\n${yaml}\n---\n${body ? `${body.trimEnd()}\n` : ""}`, "utf8");
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) return listMarkdownFiles(fullPath);
        if (entry.isFile() && entry.name.toLowerCase().endsWith(markdownExtension)) return [fullPath];
        return [];
      }),
  );

  return nested.flat();
}

export async function listVaults(): Promise<VaultInfo[]> {
  const prefs = preferences();
  if (prefs.vaultMode === "single") {
    return [
      {
        name: path.basename(prefs.vaultPath),
        path: prefs.vaultPath,
        settings: await readVaultSettings(prefs.vaultPath, prefs),
      },
    ];
  }

  const entries = await readdir(prefs.vaultPath, { withFileTypes: true });
  const vaultCandidates = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: path.join(prefs.vaultPath, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const vaults = await Promise.all(
    vaultCandidates.map(async (vault) => ({
      ...vault,
      settings: await readVaultSettings(vault.path, prefs),
    })),
  );

  if (vaults.length === 0) {
    throw new Error("Multiple vault mode is enabled, but no child folders were found in the configured folder.");
  }

  return vaults;
}

export function isMultipleVaultMode() {
  return preferences().vaultMode === "multiple";
}

export function sortVaultsForDefault(vaults: VaultInfo[], defaultVaultName?: string) {
  const defaultVault = defaultVaultName?.toLowerCase();
  return [...vaults].sort((a, b) => {
    if (defaultVault) {
      const aIsDefault = a.name.toLowerCase() === defaultVault;
      const bIsDefault = b.name.toLowerCase() === defaultVault;
      if (aIsDefault !== bIsDefault) return aIsDefault ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

export async function defaultVaultName() {
  const value = await LocalStorage.getItem<string>(defaultVaultStorageKey);
  return value?.trim() || undefined;
}

export async function setDefaultVaultName(vaultName: string) {
  await LocalStorage.setItem(defaultVaultStorageKey, vaultName);
}

export async function naturalLanguageDateTarget(vaultName?: string): Promise<"due" | "scheduled"> {
  const vault = await resolveVaultForCreate(vaultName);
  return vault.settings.nlpDefaultToScheduled ? "scheduled" : "due";
}

async function availableFilename(directory: string, slug: string): Promise<string> {
  let candidate = `${slug}${markdownExtension}`;
  let suffix = 2;

  while (existsSync(path.join(directory, candidate))) {
    candidate = `${slug}-${suffix}${markdownExtension}`;
    suffix += 1;
  }

  return candidate;
}

export async function assertVaultIsReadable() {
  const prefs = preferences();
  const stats = await stat(prefs.vaultPath);
  if (!stats.isDirectory()) {
    throw new Error("The configured Obsidian vault or vaults folder is not a directory.");
  }
}

export function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateValue(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return formatDate(value);
}

function formatDateTime(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, "0");
  const offsetRemainder = String(absOffsetMinutes % 60).padStart(2, "0");
  const local = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join(":");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${local}T${time}.${milliseconds}${sign}${offsetHours}:${offsetRemainder}`;
}

function dateValue(value: unknown): string | undefined {
  if (value instanceof Date) return formatDate(value);
  return stringValue(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isTaskNote(frontmatter: Record<string, unknown>, tags: string[], settings: TaskNotesSettings) {
  if (settings.taskIdentificationMethod === "tag") return tags.includes(settings.taskTag);
  if (!settings.taskPropertyName || !settings.taskPropertyValue) return false;

  const value = frontmatter[settings.taskPropertyName];
  return normalizeComparable(value) === normalizeComparable(settings.taskPropertyValue);
}

function normalizeComparable(value: unknown) {
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim().toLowerCase();
  return "";
}

function coercePreferenceValue(value: string) {
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}

async function resolveVaultForCreate(vaultName: string | undefined) {
  const prefs = preferences();
  const vaults = await listVaults();
  if (prefs.vaultMode === "single") return vaults[0];

  const normalizedVaultName = vaultName?.trim().toLowerCase();
  if (!normalizedVaultName) {
    throw new Error("Choose a vault before creating a task in multiple vault mode.");
  }

  const vault = vaults.find((candidate) => candidate.name.toLowerCase() === normalizedVaultName);
  if (!vault) {
    throw new Error(`Vault "${vaultName}" was not found in the configured vaults folder.`);
  }

  return vault;
}

async function settingsForTask(task: TaskNote) {
  return readVaultSettings(task.vaultPath, preferences());
}

async function readVaultSettings(vaultPath: string, prefs: Preferences): Promise<TaskNotesSettings> {
  const fallback = fallbackSettings(prefs);
  try {
    const raw = await readFile(path.join(vaultPath, taskNotesSettingsPath), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const customStatuses = Array.isArray(parsed.customStatuses)
      ? parsed.customStatuses.filter(
          (status): status is Record<string, unknown> => Boolean(status) && typeof status === "object",
        )
      : [];

    return {
      tasksFolder: stringValue(parsed.tasksFolder) || fallback.tasksFolder,
      taskIdentificationMethod: parsed.taskIdentificationMethod === "property" ? "property" : "tag",
      taskTag: stripHash(stringValue(parsed.taskTag) || fallback.taskTag),
      taskPropertyName: stringValue(parsed.taskPropertyName) || fallback.taskPropertyName,
      taskPropertyValue: stringValue(parsed.taskPropertyValue) || fallback.taskPropertyValue,
      storeTitleInFilename:
        typeof parsed.storeTitleInFilename === "boolean" ? parsed.storeTitleInFilename : fallback.storeTitleInFilename,
      taskFilenameFormat: filenameFormatValue(parsed.taskFilenameFormat) || fallback.taskFilenameFormat,
      customFilenameTemplate: stringValue(parsed.customFilenameTemplate) || fallback.customFilenameTemplate,
      defaultTaskStatus: stringValue(parsed.defaultTaskStatus) || fallback.defaultTaskStatus,
      defaultTaskPriority: stringValue(parsed.defaultTaskPriority) ?? fallback.defaultTaskPriority,
      completedStatuses: completedStatuses(customStatuses, fallback.completedStatuses),
      nlpDefaultToScheduled:
        typeof parsed.nlpDefaultToScheduled === "boolean"
          ? parsed.nlpDefaultToScheduled
          : fallback.nlpDefaultToScheduled,
      fieldMapping: {
        ...defaultFieldMapping,
        ...(typeof parsed.fieldMapping === "object" && parsed.fieldMapping ? parsed.fieldMapping : {}),
      },
      taskCreationDefaults: {
        ...defaultTaskCreationDefaults,
        ...(typeof parsed.taskCreationDefaults === "object" && parsed.taskCreationDefaults
          ? parsed.taskCreationDefaults
          : {}),
      } as TaskCreationDefaults,
    };
  } catch {
    return fallback;
  }
}

function fallbackSettings(prefs: Preferences): TaskNotesSettings {
  return {
    tasksFolder: prefs.tasksFolder,
    taskIdentificationMethod: prefs.taskPropertyName && prefs.taskPropertyValue ? "property" : "tag",
    taskTag: prefs.taskTag,
    taskPropertyName: prefs.taskPropertyName,
    taskPropertyValue: prefs.taskPropertyValue,
    storeTitleInFilename: prefs.storeTitleInFilename ?? true,
    taskFilenameFormat: prefs.filenameFormat || "title",
    customFilenameTemplate: "{title}",
    defaultTaskStatus: prefs.openStatus,
    defaultTaskPriority: "",
    completedStatuses: [prefs.doneStatus],
    nlpDefaultToScheduled: true,
    fieldMapping: defaultFieldMapping,
    taskCreationDefaults: defaultTaskCreationDefaults,
  };
}

function completedStatuses(statuses: Record<string, unknown>[], fallback: string[]) {
  const completed = statuses
    .filter((status) => status.isCompleted === true)
    .map((status) => stringValue(status.value))
    .filter((value): value is string => Boolean(value));

  return completed.length > 0 ? completed : fallback;
}

function filenameFormatValue(value: unknown): TaskNotesSettings["taskFilenameFormat"] | undefined {
  return value === "title" || value === "zettel" || value === "timestamp" || value === "custom" ? value : undefined;
}

function field(settings: TaskNotesSettings, key: string) {
  return settings.fieldMapping[key] || defaultFieldMapping[key] || key;
}

function stripHash(value: string) {
  return value.replace(/^#/, "").trim();
}

function stripAt(value: string) {
  return value.replace(/^@/, "").trim();
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function expandHome(value: string) {
  return value.startsWith("~") ? path.join(os.homedir(), value.slice(1)) : value;
}

function filenameStem(
  task: {
    title: string;
    priority?: string;
    status?: string;
    tags?: string[];
    contexts?: string[];
    projects?: string[];
  },
  settings: TaskNotesSettings,
  date: Date,
) {
  if (settings.storeTitleInFilename) return sanitizeFilename(task.title);

  switch (settings.taskFilenameFormat) {
    case "title":
      return sanitizeFilename(task.title);
    case "zettel":
      return zettelFilename(date);
    case "timestamp":
      return timestampForFilename(date);
    case "custom":
      return customFilename(task, settings, date);
  }
}

function sanitizeFilename(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*#[\]]/g, "")
      .replaceAll(/./gs, (character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || (code >= 127 && code <= 159) ? "" : character;
      })
      .replace(/^\.+|\.+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "Untitled task"
  );
}

function timestampForFilename(date: Date) {
  return `${formatDate(date)}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
}

function zettelFilename(date: Date) {
  const shortDate = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const secondsSinceMidnight = Math.floor((date.getTime() - startOfDay.getTime()) / 1000).toString(36);
  return `${shortDate}${secondsSinceMidnight}`;
}

function customFilename(
  task: {
    title: string;
    priority?: string;
    status?: string;
    tags?: string[];
    contexts?: string[];
    projects?: string[];
  },
  settings: TaskNotesSettings,
  date: Date,
) {
  const title = sanitizeFilename(task.title);
  const priority = task.priority || settings.defaultTaskPriority || "normal";
  const status = task.status || settings.defaultTaskStatus || "open";
  const contexts = task.contexts ?? [];
  const projects = task.projects ?? [];
  const tags = task.tags ?? [];
  const values: Record<string, string> = {
    title,
    date: formatDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`,
    priority,
    status,
    timestamp: timestampForFilename(date),
    dateTime: `${formatDate(date)}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`,
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
    context: contexts[0] ? sanitizeFilename(contexts[0]) : "",
    contexts: contexts.map(sanitizeFilename).join("/"),
    project: projects[0] ? sanitizeFilename(projectName(projects[0])) : "",
    projects: projects.map((project) => sanitizeFilename(projectName(project))).join("/"),
    tags: tags.map(sanitizeFilename).join(", "),
    hashtags: tags.map((tag) => `#${sanitizeFilename(tag)}`).join(" "),
    zettel: zettelFilename(date),
  };

  let output = settings.customFilenameTemplate || "{title}";
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value).replaceAll(`{${key}}`, value);
  }

  output = output.replace(/\{\{[^}]+\}\}/g, "").replace(/\{[^}]+\}/g, "");
  return sanitizeFilename(output || title);
}

function listOrDefault(value: string | undefined, defaultValue: string) {
  const values = splitCsv(value);
  return values.length > 0 ? values : splitCsv(defaultValue);
}

async function projectLinks(projects: string[], vaultPath: string) {
  const plainProjects = projects.filter((project) => !isProjectLink(project));
  const files = plainProjects.length > 0 ? await listMarkdownFiles(vaultPath) : [];

  return projects.map((project) => projectLink(project, vaultPath, files));
}

function projectLink(project: string, vaultPath: string, files: string[]) {
  const value = project.trim();
  if (isProjectLink(value)) return value;

  const matches = files.filter((file) => {
    const relativePath = path.relative(vaultPath, file).replace(/\.md$/i, "");
    return (
      relativePath.localeCompare(value, undefined, { sensitivity: "accent" }) === 0 ||
      path.basename(relativePath).localeCompare(value, undefined, { sensitivity: "accent" }) === 0
    );
  });

  const linkTarget = matches.length === 1 ? path.relative(vaultPath, matches[0]).replace(/\.md$/i, "") : value;
  return `[[${linkTarget}]]`;
}

function isProjectLink(value: string) {
  return /^\[\[[\s\S]+\]\]$/.test(value) || /^\[[^\]]*\]\([^)]+\)$/.test(value);
}

function projectName(value: string) {
  const wikiLink = value.match(/^\[\[([\s\S]+)\]\]$/);
  if (wikiLink) return wikiLink[1].split("|").at(-1) || wikiLink[1];

  const markdownLink = value.match(/^\[([^\]]*)\]\([^)]+\)$/);
  if (markdownLink) return markdownLink[1] || value;

  return value;
}

function taskTags(value: string | undefined, settings: TaskNotesSettings) {
  const explicitTags = splitCsv(value).map(stripHash);
  const tags =
    explicitTags.length > 0 ? explicitTags : splitCsv(settings.taskCreationDefaults.defaultTags).map(stripHash);
  if (settings.taskIdentificationMethod === "tag") tags.unshift(settings.taskTag);
  return unique(tags);
}

function defaultDateValue(value: string | undefined) {
  if (!value || value === "none") return undefined;
  const date = new Date();
  if (value === "today") return formatDate(date);
  if (value === "tomorrow") {
    date.setDate(date.getDate() + 1);
    return formatDate(date);
  }
  if (value === "nextWeek") {
    date.setDate(date.getDate() + 7);
    return formatDate(date);
  }
  return value;
}

function recurrenceValue(value: string) {
  return (
    {
      daily: "FREQ=DAILY",
      weekly: "FREQ=WEEKLY",
      monthly: "FREQ=MONTHLY",
      yearly: "FREQ=YEARLY",
    }[value] || value
  );
}

function sortDate(value: string | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}
