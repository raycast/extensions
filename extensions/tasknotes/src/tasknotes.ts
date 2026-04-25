import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPreferenceValues } from "@raycast/api";
import YAML from "yaml";

export type TaskStatus = "open" | "done" | string;

export type Preferences = {
  vaultPath: string;
  vaultMode: "single" | "multiple";
  tasksFolder: string;
  taskTag: string;
  taskPropertyName?: string;
  taskPropertyValue?: string;
  openStatus: string;
  doneStatus: string;
};

export type TaskNote = {
  title: string;
  status: TaskStatus;
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
  tags?: string;
};

export type VaultInfo = {
  name: string;
  path: string;
};

const markdownExtension = ".md";

export function preferences() {
  const values = getPreferenceValues<Preferences>();
  return {
    ...values,
    vaultPath: expandHome(values.vaultPath),
    vaultMode: values.vaultMode || "single",
    tasksFolder: trimSlashes(values.tasksFolder),
    taskTag: stripHash(values.taskTag),
    taskPropertyName: values.taskPropertyName?.trim(),
    taskPropertyValue: values.taskPropertyValue?.trim(),
  };
}

export async function listTaskNotes(): Promise<TaskNote[]> {
  const prefs = preferences();
  const vaults = await listVaults();
  const nestedTasks = await Promise.all(
    vaults.map(async (vault) => {
      const files = await listMarkdownFiles(vault.path);
      return Promise.all(files.map((file) => readTaskNote(file, prefs, vault)));
    }),
  );

  return nestedTasks
    .flat()
    .filter((task): task is TaskNote => Boolean(task))
    .sort((a, b) => {
      const aDone = a.status === prefs.doneStatus ? 1 : 0;
      const bDone = b.status === prefs.doneStatus ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return sortDate(a.due) - sortDate(b.due) || a.title.localeCompare(b.title);
    });
}

export async function createTaskNote(values: NewTaskValues): Promise<TaskNote> {
  const prefs = preferences();
  const vault = await resolveVaultForCreate(values.vaultName);
  const title = values.title.trim();
  const now = new Date();
  const taskDirectory = path.join(vault.path, prefs.tasksFolder);
  await mkdir(taskDirectory, { recursive: true });

  const tags = unique([prefs.taskTag, ...splitCsv(values.tags).map(stripHash)]);
  const frontmatter: Record<string, unknown> = {
    title,
    status: values.status || prefs.openStatus,
    tags,
    dateCreated: formatDateTime(now),
    dateModified: formatDateTime(now),
  };

  if (prefs.taskPropertyName && prefs.taskPropertyValue) {
    frontmatter[prefs.taskPropertyName] = coercePreferenceValue(prefs.taskPropertyValue);
  }

  if (values.priority) frontmatter.priority = values.priority;
  if (values.due) frontmatter.due = formatDateValue(values.due);
  if (values.scheduled) frontmatter.scheduled = formatDateValue(values.scheduled);

  const contexts = splitCsv(values.contexts).map((context) => `@${stripAt(context)}`);
  if (contexts.length > 0) frontmatter.contexts = contexts;

  const body = values.details?.trim() ? `${values.details.trim()}\n` : "";
  const filename = await availableFilename(taskDirectory, slugify(title));
  const filePath = path.join(taskDirectory, filename);
  await writeTaskFile(filePath, frontmatter, body);

  const task = await readTaskNote(filePath, prefs, vault);
  if (!task) {
    throw new Error("Created task could not be read back from disk.");
  }

  return task;
}

export async function setTaskStatus(task: TaskNote, status: string): Promise<void> {
  const frontmatter: Record<string, unknown> = {
    ...task.frontmatter,
    status,
    dateModified: formatDateTime(new Date()),
  };

  const prefs = preferences();
  if (status === prefs.doneStatus) {
    frontmatter.completedDate = formatDateTime(new Date());
  } else {
    delete frontmatter.completedDate;
  }

  await writeTaskFile(task.path, frontmatter, task.body);
}

export async function updateTaskTitle(task: TaskNote, title: string): Promise<TaskNote> {
  const nextTitle = title.trim();
  if (!nextTitle) throw new Error("Task title is required.");

  const frontmatter = {
    ...task.frontmatter,
    title: nextTitle,
    dateModified: formatDateTime(new Date()),
  };

  await writeTaskFile(task.path, frontmatter, task.body);
  const nextPath = path.join(path.dirname(task.path), `${slugify(nextTitle)}${markdownExtension}`);

  if (nextPath !== task.path && !existsSync(nextPath)) {
    await rename(task.path, nextPath);
    const nextTask = await readTaskNote(nextPath, preferences(), {
      name: task.vaultName,
      path: task.vaultPath,
    });
    if (nextTask) return nextTask;
  }

  const nextTask = await readTaskNote(task.path, preferences(), {
    name: task.vaultName,
    path: task.vaultPath,
  });
  if (!nextTask) throw new Error("Updated task could not be read back from disk.");
  return nextTask;
}

export function obsidianUrl(task: TaskNote): string {
  const fileWithoutExtension = task.relativePath.replace(/\.md$/i, "");
  return `obsidian://open?vault=${encodeURIComponent(task.vaultName)}&file=${encodeURIComponent(fileWithoutExtension)}`;
}

export function taskSubtitle(task: TaskNote): string | undefined {
  const parts = [
    task.status,
    task.priority ? `priority ${task.priority}` : undefined,
    task.contexts.length > 0 ? task.contexts.map((context) => `@${context}`).join(" ") : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

async function readTaskNote(filePath: string, prefs: Preferences, vault: VaultInfo): Promise<TaskNote | undefined> {
  const raw = await readFile(filePath, "utf8");
  const parsed = parseMarkdown(raw);
  if (!parsed) return undefined;

  const tags = normalizeArray(parsed.frontmatter.tags).map(stripHash);
  if (!isTaskNote(parsed.frontmatter, tags, prefs)) return undefined;

  const title = stringValue(parsed.frontmatter.title) || path.basename(filePath, markdownExtension);
  const status = stringValue(parsed.frontmatter.status) || prefs.openStatus;

  return {
    title,
    status,
    path: filePath,
    vaultName: vault.name,
    vaultPath: vault.path,
    relativePath: path.relative(vault.path, filePath),
    body: parsed.body,
    frontmatter: parsed.frontmatter,
    due: dateValue(parsed.frontmatter.due),
    scheduled: dateValue(parsed.frontmatter.scheduled),
    priority: stringValue(parsed.frontmatter.priority),
    contexts: normalizeArray(parsed.frontmatter.contexts).map(stripAt),
    tags,
  };
}

function parseMarkdown(raw: string): { frontmatter: Record<string, unknown>; body: string } | undefined {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return undefined;

  const frontmatter = YAML.parse(match[1]) ?? {};
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
    return [{ name: path.basename(prefs.vaultPath), path: prefs.vaultPath }];
  }

  const entries = await readdir(prefs.vaultPath, { withFileTypes: true });
  const vaults = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: path.join(prefs.vaultPath, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (vaults.length === 0) {
    throw new Error("Multiple vault mode is enabled, but no child folders were found in the configured folder.");
  }

  return vaults;
}

export function isMultipleVaultMode() {
  return preferences().vaultMode === "multiple";
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
  return date.toISOString().slice(0, 10);
}

function formatDateValue(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return formatDate(value);
}

function formatDateTime(date: Date) {
  return date.toISOString();
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

function isTaskNote(frontmatter: Record<string, unknown>, tags: string[], prefs: Preferences) {
  if (tags.includes(prefs.taskTag)) return true;
  if (!prefs.taskPropertyName || !prefs.taskPropertyValue) return false;

  const value = frontmatter[prefs.taskPropertyName];
  return normalizeComparable(value) === normalizeComparable(prefs.taskPropertyValue);
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

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "task";
}

function sortDate(value: string | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}
