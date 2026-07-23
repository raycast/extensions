import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { getFeatureStatus, loadFeatureStatuses } from "./features.ts";
import {
  defaultSearchIndexPath,
  inspectSearchIndex,
  markSearchIndexForRebuild,
  promptLibraryFingerprint,
  rebuildSearchIndex,
  removeSearchRecord,
  type SearchIndexHealth,
  upsertSearchRecord,
} from "./search-index.ts";

const HEADER = "---prompt-studio-json\n";
const HEADER_END = "\n---\n";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PROMPT_TARGETS = ["generic", "codex", "claude-code"] as const;
export type PromptTarget = (typeof PROMPT_TARGETS)[number];

export interface ProjectBinding {
  name: string;
  path: string;
  branch?: string;
  commit?: string;
}

export interface PromptSource {
  title: string;
  url?: string;
  retrievedAt: string;
  supports?: string[];
}

export interface PromptTaxonomy {
  taskTypes: string[];
  technologies: string[];
  artifacts: string[];
  problems: string[];
  workflows: string[];
}

export interface EnhancementProvenance {
  provider: "openai" | "anthropic" | "google";
  profileId: string;
  model: string;
  reasoningEffort: string;
  compilerVersion: string;
  outputSchemaVersion: number;
  generatedAt: string;
}

export interface PromptMetadata {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  target: PromptTarget;
  tags: string[];
  aliases: string[];
  searchTerms: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  archivedAt?: string;
  project?: ProjectBinding;
  projectFiles?: string[];
  assumptions?: string[];
  missingInformation?: string[];
  validationSteps?: string[];
  taxonomy?: PromptTaxonomy;
  sources?: PromptSource[];
  enhancement?: EnhancementProvenance;
}

export interface PromptRecord extends PromptMetadata {
  body: string;
  filePath: string;
}

export interface PromptDraft {
  title: string;
  summary?: string;
  body: string;
  target: PromptTarget;
  tags?: string[];
  aliases?: string[];
  searchTerms?: string[];
  project?: ProjectBinding;
  projectFiles?: string[];
  assumptions?: string[];
  missingInformation?: string[];
  validationSteps?: string[];
  taxonomy?: PromptTaxonomy;
  sources?: PromptSource[];
  enhancement?: EnhancementProvenance;
}

export interface PromptUpdate extends PromptDraft {
  favorite?: boolean;
  archived?: boolean;
}

export interface InvalidPrompt {
  filePath: string;
  error: string;
}

export interface PromptLibrary {
  records: PromptRecord[];
  invalid: InvalidPrompt[];
}

export function defaultPromptDirectory(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Prompt Studio",
    "Prompts",
  );
}

export function resolvePromptDirectory(configured?: string): string {
  const value = configured?.trim() || defaultPromptDirectory();
  const expanded =
    value === "~"
      ? homedir()
      : value.startsWith("~/")
        ? join(homedir(), value.slice(2))
        : value;
  if (!isAbsolute(expanded)) {
    throw new Error(
      "Prompt directory must be an absolute path or start with ~/.",
    );
  }
  return resolve(expanded);
}

export async function listPrompts(directory: string): Promise<PromptLibrary> {
  await mkdir(directory, { recursive: true });
  return listPromptFiles(directory);
}

export async function listPromptsReadOnly(
  directory: string,
): Promise<PromptLibrary> {
  return listPromptFiles(directory);
}

async function listPromptFiles(directory: string): Promise<PromptLibrary> {
  const entries = await readdir(directory, { withFileTypes: true });
  const records: PromptRecord[] = [];
  const invalid: InvalidPrompt[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const filePath = join(directory, entry.name);
    try {
      records.push(parsePrompt(await readFile(filePath, "utf8"), filePath));
    } catch (error) {
      invalid.push({ filePath, error: errorMessage(error) });
    }
  }

  records.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.title.localeCompare(right.title),
  );
  invalid.sort((left, right) => left.filePath.localeCompare(right.filePath));
  return { records, invalid };
}

export async function createPrompt(
  directory: string,
  draft: PromptDraft,
): Promise<PromptRecord> {
  const now = new Date().toISOString();
  const metadata: PromptMetadata = validateMetadata({
    schemaVersion: 1,
    id: randomUUID(),
    title: draft.title.trim(),
    summary: (draft.summary?.trim() || summarize(draft.body)).trim(),
    target: draft.target,
    tags: normalizeTerms(draft.tags),
    aliases: normalizeTerms(draft.aliases),
    searchTerms: normalizeTerms(draft.searchTerms),
    createdAt: now,
    updatedAt: now,
    favorite: false,
    ...(draft.project ? { project: draft.project } : {}),
    ...(draft.projectFiles ? { projectFiles: draft.projectFiles } : {}),
    ...(draft.assumptions ? { assumptions: draft.assumptions } : {}),
    ...(draft.missingInformation
      ? { missingInformation: draft.missingInformation }
      : {}),
    ...(draft.validationSteps
      ? { validationSteps: draft.validationSteps }
      : {}),
    ...(draft.taxonomy ? { taxonomy: draft.taxonomy } : {}),
    ...(draft.sources ? { sources: draft.sources } : {}),
    ...(draft.enhancement ? { enhancement: draft.enhancement } : {}),
  });
  const body = validateBody(draft.body);
  const filePath = join(
    directory,
    `${slug(metadata.title)}--${metadata.id}.md`,
  );
  await atomicWrite(filePath, serializePrompt(metadata, body));
  const record = { ...metadata, body, filePath };
  await refreshActiveSearchIndex(directory, record);
  return record;
}

export async function updatePrompt(
  directory: string,
  id: string,
  update: PromptUpdate,
): Promise<PromptRecord> {
  const current = await findPrompt(directory, id);
  const currentMetadata = metadataFrom(current);
  if (update.archived !== undefined) delete currentMetadata.archivedAt;
  const archivedAt =
    update.archived === undefined
      ? current.archivedAt
      : update.archived
        ? new Date().toISOString()
        : undefined;
  const metadata = validateMetadata({
    ...currentMetadata,
    title: update.title.trim(),
    summary: (update.summary?.trim() || summarize(update.body)).trim(),
    target: update.target,
    tags: normalizeTerms(update.tags),
    aliases: normalizeTerms(update.aliases),
    searchTerms: normalizeTerms(update.searchTerms),
    updatedAt: new Date().toISOString(),
    favorite: update.favorite ?? current.favorite,
    ...(archivedAt ? { archivedAt } : {}),
  });
  const body = validateBody(update.body);
  await preserveVersion(directory, current);
  await atomicWrite(current.filePath, serializePrompt(metadata, body));
  const record = { ...metadata, body, filePath: current.filePath };
  await refreshActiveSearchIndex(directory, record);
  return record;
}

export async function duplicatePrompt(
  directory: string,
  id: string,
): Promise<PromptRecord> {
  const current = await findPrompt(directory, id);
  return createPrompt(directory, {
    title: `${current.title} Copy`,
    summary: current.summary,
    body: current.body,
    target: current.target,
    tags: current.tags,
    aliases: current.aliases,
    searchTerms: current.searchTerms,
    ...(current.project ? { project: current.project } : {}),
    ...(current.projectFiles ? { projectFiles: current.projectFiles } : {}),
    ...(current.assumptions ? { assumptions: current.assumptions } : {}),
    ...(current.missingInformation
      ? { missingInformation: current.missingInformation }
      : {}),
    ...(current.validationSteps
      ? { validationSteps: current.validationSteps }
      : {}),
    ...(current.taxonomy ? { taxonomy: current.taxonomy } : {}),
    ...(current.sources ? { sources: current.sources } : {}),
    ...(current.enhancement ? { enhancement: current.enhancement } : {}),
  });
}

export async function deletePrompt(
  directory: string,
  id: string,
): Promise<void> {
  const current = await findPrompt(directory, id);
  await rm(current.filePath);
  await rm(versionDirectory(directory, id), { recursive: true, force: true });
  await removeFromActiveSearchIndex(directory, id);
}

export async function listPromptVersions(
  directory: string,
  id: string,
): Promise<PromptRecord[]> {
  const history = versionDirectory(directory, id);
  try {
    const entries = await readdir(history, { withFileTypes: true });
    const versions: PromptRecord[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = join(history, entry.name);
      versions.push(parsePrompt(await readFile(filePath, "utf8"), filePath));
    }
    return versions.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

export async function rebuildPromptSearchIndex(
  directory: string,
  path = defaultSearchIndexPath(),
): Promise<SearchIndexHealth> {
  const library = await listPrompts(directory);
  return rebuildSearchIndex(
    library.records,
    path,
    await collectVersions(directory, library.records),
  );
}

export async function ensurePromptSearchIndex(
  directory: string,
  path = defaultSearchIndexPath(),
): Promise<SearchIndexHealth> {
  const library = await listPrompts(directory);
  const health = inspectSearchIndex(path, library.records);
  return health.needsRebuild
    ? rebuildSearchIndex(
        library.records,
        path,
        await collectVersions(directory, library.records),
      )
    : health;
}

export async function restorePromptVersion(
  directory: string,
  id: string,
  versionPath: string,
): Promise<PromptRecord> {
  const expected = resolve(
    versionDirectory(directory, id),
    basename(versionPath),
  );
  if (resolve(versionPath) !== expected) {
    throw new Error("Version path is outside this prompt's history.");
  }

  const current = await findPrompt(directory, id);
  const version = parsePrompt(await readFile(expected, "utf8"), expected);
  const metadata = validateMetadata({
    ...metadataFrom(version),
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  await preserveVersion(directory, current);
  await atomicWrite(current.filePath, serializePrompt(metadata, version.body));
  const record = {
    ...metadata,
    body: version.body,
    filePath: current.filePath,
  };
  await refreshActiveSearchIndex(directory, record);
  return record;
}

export function parsePrompt(
  source: string,
  filePath = "<memory>",
): PromptRecord {
  if (!source.startsWith(HEADER)) {
    throw new Error("Missing Prompt Studio metadata header.");
  }
  const end = source.indexOf(HEADER_END, HEADER.length);
  if (end === -1) {
    throw new Error("Missing metadata closing marker.");
  }

  let rawMetadata: unknown;
  try {
    rawMetadata = JSON.parse(source.slice(HEADER.length, end));
  } catch {
    throw new Error("Metadata is not valid JSON.");
  }

  const metadata = validateMetadata(rawMetadata);
  const rawBody = source.slice(end + HEADER_END.length);
  const body = validateBody(
    rawBody.endsWith("\n") ? rawBody.slice(0, -1) : rawBody,
  );
  return { ...metadata, body, filePath };
}

export function serializePrompt(
  metadata: PromptMetadata,
  body: string,
): string {
  const validated = validateMetadata(metadata);
  return `${HEADER}${JSON.stringify(validated, null, 2)}${HEADER_END}${validateBody(body)}\n`;
}

function validateMetadata(value: unknown): PromptMetadata {
  if (!isObject(value)) throw new Error("Metadata must be a JSON object.");
  if (value.schemaVersion !== 1)
    throw new Error("Unsupported prompt schema version.");

  const id = requiredString(value.id, "id");
  if (!UUID.test(id)) throw new Error("Prompt id must be a UUID.");

  const target = requiredString(value.target, "target");
  if (!PROMPT_TARGETS.includes(target as PromptTarget))
    throw new Error(`Unsupported target: ${target}.`);

  const createdAt = timestamp(value.createdAt, "createdAt");
  const updatedAt = timestamp(value.updatedAt, "updatedAt");
  const metadata: PromptMetadata = {
    schemaVersion: 1,
    id,
    title: requiredString(value.title, "title"),
    summary: requiredString(value.summary, "summary"),
    target: target as PromptTarget,
    tags: termArray(value.tags, "tags"),
    aliases:
      value.aliases === undefined ? [] : termArray(value.aliases, "aliases"),
    searchTerms: termArray(value.searchTerms, "searchTerms"),
    createdAt,
    updatedAt,
    favorite: booleanValue(value.favorite, "favorite"),
  };

  if (value.archivedAt !== undefined)
    metadata.archivedAt = timestamp(value.archivedAt, "archivedAt");
  if (value.project !== undefined)
    metadata.project = projectBinding(value.project);
  if (value.projectFiles !== undefined)
    metadata.projectFiles = textArray(value.projectFiles, "projectFiles");
  if (value.assumptions !== undefined)
    metadata.assumptions = textArray(value.assumptions, "assumptions");
  if (value.missingInformation !== undefined) {
    metadata.missingInformation = textArray(
      value.missingInformation,
      "missingInformation",
    );
  }
  if (value.validationSteps !== undefined) {
    metadata.validationSteps = textArray(
      value.validationSteps,
      "validationSteps",
    );
  }
  if (value.taxonomy !== undefined)
    metadata.taxonomy = promptTaxonomy(value.taxonomy);
  if (value.sources !== undefined)
    metadata.sources = promptSources(value.sources);
  if (value.enhancement !== undefined)
    metadata.enhancement = enhancementProvenance(value.enhancement);
  return metadata;
}

function projectBinding(value: unknown): ProjectBinding {
  if (!isObject(value)) throw new Error("project must be an object.");
  const project: ProjectBinding = {
    name: requiredString(value.name, "project.name"),
    path: requiredString(value.path, "project.path"),
  };
  if (value.branch !== undefined)
    project.branch = requiredString(value.branch, "project.branch");
  if (value.commit !== undefined)
    project.commit = requiredString(value.commit, "project.commit");
  return project;
}

function promptSources(value: unknown): PromptSource[] {
  if (!Array.isArray(value)) throw new Error("sources must be an array.");
  return value.map((source, index) => {
    if (!isObject(source))
      throw new Error(`sources[${index}] must be an object.`);
    const result: PromptSource = {
      title: requiredString(source.title, `sources[${index}].title`),
      retrievedAt: timestamp(
        source.retrievedAt,
        `sources[${index}].retrievedAt`,
      ),
    };
    if (source.url !== undefined)
      result.url = requiredString(source.url, `sources[${index}].url`);
    if (source.supports !== undefined) {
      result.supports = textArray(
        source.supports,
        `sources[${index}].supports`,
      );
    }
    return result;
  });
}

function promptTaxonomy(value: unknown): PromptTaxonomy {
  if (!isObject(value)) throw new Error("taxonomy must be an object.");
  return {
    taskTypes: termArray(value.taskTypes, "taxonomy.taskTypes"),
    technologies: termArray(value.technologies, "taxonomy.technologies"),
    artifacts: termArray(value.artifacts, "taxonomy.artifacts"),
    problems: termArray(value.problems, "taxonomy.problems"),
    workflows: termArray(value.workflows, "taxonomy.workflows"),
  };
}

function enhancementProvenance(value: unknown): EnhancementProvenance {
  if (!isObject(value)) throw new Error("enhancement must be an object.");
  const provider = requiredString(value.provider, "enhancement.provider");
  if (!["openai", "anthropic", "google"].includes(provider)) {
    throw new Error(`Unsupported enhancement provider: ${provider}.`);
  }
  const outputSchemaVersion = value.outputSchemaVersion;
  if (
    typeof outputSchemaVersion !== "number" ||
    !Number.isInteger(outputSchemaVersion) ||
    outputSchemaVersion < 1
  ) {
    throw new Error(
      "enhancement.outputSchemaVersion must be a positive integer.",
    );
  }
  return {
    provider: provider as EnhancementProvenance["provider"],
    profileId: requiredString(value.profileId, "enhancement.profileId"),
    model: requiredString(value.model, "enhancement.model"),
    reasoningEffort: requiredString(
      value.reasoningEffort,
      "enhancement.reasoningEffort",
    ),
    compilerVersion: requiredString(
      value.compilerVersion,
      "enhancement.compilerVersion",
    ),
    outputSchemaVersion,
    generatedAt: timestamp(value.generatedAt, "enhancement.generatedAt"),
  };
}

function validateBody(value: string): string {
  if (!value.trim()) throw new Error("Prompt body is required.");
  return value;
}

function normalizeTerms(values: string[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean),
    ),
  ].sort();
}

function summarize(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) throw new Error("Prompt body is required.");
  return compact.length <= 160
    ? compact
    : `${compact.slice(0, 157).trimEnd()}…`;
}

function slug(value: string): string {
  const result = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return result || "prompt";
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporary = join(
    dirname(filePath),
    `.${basename(filePath)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, content, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function findPrompt(
  directory: string,
  id: string,
): Promise<PromptRecord> {
  // ponytail: O(n) lookup is deliberate until SQLite Activation 1 owns fast ID lookup.
  const prompt = (await listPrompts(directory)).records.find(
    (record) => record.id === id,
  );
  if (!prompt) throw new Error(`Prompt not found: ${id}.`);
  return prompt;
}

async function preserveVersion(
  directory: string,
  record: PromptRecord,
): Promise<void> {
  const filePath = join(
    versionDirectory(directory, record.id),
    `${record.updatedAt.replace(/[:.]/g, "-")}--${randomUUID()}.md`,
  );
  await atomicWrite(
    filePath,
    serializePrompt(metadataFrom(record), record.body),
  );
}

async function refreshActiveSearchIndex(
  directory: string,
  record: PromptRecord,
): Promise<void> {
  if (!(await sqliteSearchIsActive())) return;
  const path = defaultSearchIndexPath();
  try {
    const library = await listPrompts(directory);
    const health = inspectSearchIndex(path);
    if (health.needsRebuild) {
      rebuildSearchIndex(
        library.records,
        path,
        await collectVersions(directory, library.records),
      );
      return;
    }
    upsertSearchRecord(
      record,
      await listPromptVersions(directory, record.id),
      path,
      promptLibraryFingerprint(library.records),
    );
  } catch (error) {
    markSearchIndexForRebuild(errorMessage(error), path);
  }
}

async function removeFromActiveSearchIndex(
  directory: string,
  id: string,
): Promise<void> {
  if (!(await sqliteSearchIsActive())) return;
  const path = defaultSearchIndexPath();
  try {
    const library = await listPrompts(directory);
    const health = inspectSearchIndex(path);
    if (health.needsRebuild) {
      rebuildSearchIndex(
        library.records,
        path,
        await collectVersions(directory, library.records),
      );
      return;
    }
    removeSearchRecord(id, path, promptLibraryFingerprint(library.records));
  } catch (error) {
    markSearchIndexForRebuild(errorMessage(error), path);
  }
}

async function collectVersions(
  directory: string,
  records: readonly PromptRecord[],
): Promise<Map<string, PromptRecord[]>> {
  return new Map(
    await Promise.all(
      records.map(
        async (record) =>
          [record.id, await listPromptVersions(directory, record.id)] as const,
      ),
    ),
  );
}

async function sqliteSearchIsActive(): Promise<boolean> {
  if (process.env.PROMPT_STUDIO_DISABLE_INDEX_SYNC === "1") return false;
  try {
    return (
      getFeatureStatus(await loadFeatureStatuses(), "sqlite-search")
        .effectiveState === "active"
    );
  } catch {
    return false;
  }
}

function versionDirectory(directory: string, id: string): string {
  return join(directory, ".history", id);
}

function metadataFrom(record: PromptRecord): PromptMetadata {
  const metadata: Record<string, unknown> = { ...record };
  delete metadata.body;
  delete metadata.filePath;
  return validateMetadata(metadata);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function termArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw new Error(`${field} must be an array of non-empty strings.`);
  }
  return normalizeTerms(value as string[]);
}

function textArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw new Error(`${field} must be an array of non-empty strings.`);
  }
  return [
    ...new Set((value as string[]).map((item) => item.trim()).filter(Boolean)),
  ];
}

function timestamp(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (Number.isNaN(Date.parse(result)))
    throw new Error(`${field} must be an ISO timestamp.`);
  return result;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean")
    throw new Error(`${field} must be true or false.`);
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFile(error: unknown): boolean {
  return isObject(error) && error.code === "ENOENT";
}
