import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  serializePrompt,
  type EnhancementProvenance,
  type PromptRecord,
  type PromptSource,
  type PromptTarget,
} from "./prompt-store.ts";
import { containsLikelySecret } from "./secrets.ts";

const FEEDBACK_SCHEMA_VERSION = 1;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const FEEDBACK_VERDICTS = ["not-rated", "useful", "not-useful"] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

export const FEEDBACK_TARGET_AGENTS = [
  "generic",
  "codex",
  "claude-code",
  "other",
] as const;
export type FeedbackTargetAgent = (typeof FEEDBACK_TARGET_AGENTS)[number];

export const FEEDBACK_OUTCOME_STATUSES = [
  "succeeded",
  "partial",
  "failed",
  "unknown",
] as const;
export type FeedbackOutcomeStatus = (typeof FEEDBACK_OUTCOME_STATUSES)[number];

export interface FeedbackPromptSnapshot {
  promptId: string;
  promptUpdatedAt: string;
  sourceDigest: string;
  snapshotDigest: string;
  title: string;
  summary: string;
  body: string;
  target: PromptTarget;
  tags: string[];
  aliases: string[];
  searchTerms: string[];
  enhancement?: EnhancementProvenance;
  project?: {
    name: string;
    branch?: string;
    commit?: string;
  };
  sources?: PromptSource[];
}

export interface PromptUseFeedbackRecord {
  schemaVersion: 1;
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  prompt: FeedbackPromptSnapshot;
  use: {
    usedAt: string;
    targetAgent: FeedbackTargetAgent;
    targetApplication?: string;
    projectCommit?: string;
  };
  verdict: FeedbackVerdict;
  rating?: number;
  critique?: string;
  correction?: string;
  finalPrompt?: string;
  outcome?: {
    status: FeedbackOutcomeStatus;
    summary?: string;
  };
  notes?: string;
  filePath: string;
}

export interface PromptUseFeedbackDraft {
  prompt: PromptRecord;
  usedAt?: string;
  targetAgent: FeedbackTargetAgent;
  targetApplication?: string;
  projectCommit?: string;
  verdict?: FeedbackVerdict;
  rating?: number;
  critique?: string;
  correction?: string;
  finalPrompt?: string;
  outcomeStatus?: FeedbackOutcomeStatus;
  outcomeSummary?: string;
  notes?: string;
}

export interface PromptUseFeedbackPatch {
  usedAt?: string;
  targetAgent?: FeedbackTargetAgent;
  targetApplication?: string | null;
  projectCommit?: string | null;
  verdict?: FeedbackVerdict;
  rating?: number | null;
  critique?: string | null;
  correction?: string | null;
  finalPrompt?: string | null;
  outcomeStatus?: FeedbackOutcomeStatus | null;
  outcomeSummary?: string | null;
  notes?: string | null;
}

export interface InvalidFeedbackRecord {
  filePath: string;
  error: string;
}

export interface FeedbackLibrary {
  records: PromptUseFeedbackRecord[];
  invalid: InvalidFeedbackRecord[];
}

export type FeedbackExportFormat = "json" | "markdown";

export function feedbackDirectory(promptDirectory: string): string {
  return join(promptDirectory, ".feedback");
}

export function promptVersionSnapshot(
  record: PromptRecord,
): FeedbackPromptSnapshot {
  const sourceDigest = createHash("sha256")
    .update(serializePrompt(record, record.body))
    .digest("hex");
  const snapshotWithoutDigest = {
    promptId: record.id,
    promptUpdatedAt: record.updatedAt,
    sourceDigest,
    title: record.title,
    summary: record.summary,
    body: record.body,
    target: record.target,
    tags: record.tags,
    aliases: record.aliases,
    searchTerms: record.searchTerms,
    ...(record.enhancement ? { enhancement: record.enhancement } : {}),
    ...(record.project
      ? {
          project: {
            name: record.project.name,
            ...(record.project.branch ? { branch: record.project.branch } : {}),
            ...(record.project.commit ? { commit: record.project.commit } : {}),
          },
        }
      : {}),
    ...(record.sources ? { sources: record.sources } : {}),
  };
  return {
    ...snapshotWithoutDigest,
    snapshotDigest: digestSnapshot(snapshotWithoutDigest),
  };
}

export async function createPromptUseFeedback(
  promptDirectory: string,
  draft: PromptUseFeedbackDraft,
  now = new Date(),
): Promise<PromptUseFeedbackRecord> {
  const id = randomUUID();
  const timestamp = now.toISOString();
  const record = validateFeedbackRecord(
    {
      schemaVersion: FEEDBACK_SCHEMA_VERSION,
      id,
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      prompt: promptVersionSnapshot(draft.prompt),
      use: {
        usedAt: optionalTimestamp(draft.usedAt, "usedAt") ?? timestamp,
        targetAgent: draft.targetAgent,
        ...optionalField(
          "targetApplication",
          optionalText(draft.targetApplication, "targetApplication", 1, 160),
        ),
        ...optionalField(
          "projectCommit",
          optionalCommit(draft.projectCommit, "projectCommit"),
        ),
      },
      verdict: draft.verdict ?? "not-rated",
      ...optionalRating(draft.rating),
      ...optionalField(
        "critique",
        optionalText(draft.critique, "critique", 1, 4_000),
      ),
      ...optionalField(
        "correction",
        optionalText(draft.correction, "correction", 1, 8_000),
      ),
      ...optionalField(
        "finalPrompt",
        optionalText(draft.finalPrompt, "finalPrompt", 1, 100_000),
      ),
      ...outcomeFields(draft.outcomeStatus, draft.outcomeSummary),
      ...optionalField("notes", optionalText(draft.notes, "notes", 1, 4_000)),
    },
    "<new>",
  );
  rejectSensitiveFeedback(record);
  const filePath = join(feedbackDirectory(promptDirectory), `${id}.json`);
  await atomicWrite(filePath, serializeFeedback(record));
  return { ...record, filePath };
}

export async function listPromptUseFeedback(
  promptDirectory: string,
  promptId?: string,
): Promise<FeedbackLibrary> {
  const directory = feedbackDirectory(promptDirectory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissingFile(error)) return { records: [], invalid: [] };
    throw error;
  }

  const records: PromptUseFeedbackRecord[] = [];
  const invalid: InvalidFeedbackRecord[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = join(directory, entry.name);
    try {
      const record = parseFeedback(await readFile(filePath, "utf8"), filePath);
      if (!promptId || record.prompt.promptId === promptId)
        records.push(record);
    } catch (error) {
      invalid.push({ filePath, error: errorMessage(error) });
    }
  }
  records.sort(
    (left, right) =>
      right.use.usedAt.localeCompare(left.use.usedAt) ||
      right.createdAt.localeCompare(left.createdAt),
  );
  invalid.sort((left, right) => left.filePath.localeCompare(right.filePath));
  return { records, invalid };
}

export async function getPromptUseFeedback(
  promptDirectory: string,
  id: string,
): Promise<PromptUseFeedbackRecord> {
  const library = await listPromptUseFeedback(promptDirectory);
  const exact = library.records.find((record) => record.id === id);
  if (exact) return exact;
  const prefix = library.records.filter(
    (record) => id.length >= 8 && record.id.startsWith(id),
  );
  if (prefix.length === 1) return prefix[0]!;
  throw new Error(
    prefix.length > 1
      ? "Feedback identifier is ambiguous."
      : "Feedback record was not found.",
  );
}

export async function updatePromptUseFeedback(
  promptDirectory: string,
  id: string,
  patch: PromptUseFeedbackPatch,
  now = new Date(),
): Promise<PromptUseFeedbackRecord> {
  const current = await getPromptUseFeedback(promptDirectory, id);
  if (Object.keys(patch).length === 0) {
    throw new Error("Feedback update requires at least one changed field.");
  }
  const outcomeStatus =
    patch.outcomeStatus === undefined
      ? current.outcome?.status
      : patch.outcomeStatus === null
        ? undefined
        : patch.outcomeStatus;
  const outcomeSummary =
    patch.outcomeSummary === undefined
      ? current.outcome?.summary
      : patch.outcomeSummary === null
        ? undefined
        : patch.outcomeSummary;
  const record = validateFeedbackRecord(
    {
      schemaVersion: 1,
      id: current.id,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: now.toISOString(),
      prompt: current.prompt,
      use: {
        usedAt:
          patch.usedAt === undefined
            ? current.use.usedAt
            : timestamp(patch.usedAt, "usedAt"),
        targetAgent: patch.targetAgent ?? current.use.targetAgent,
        ...optionalField(
          "targetApplication",
          patchText(
            patch.targetApplication,
            current.use.targetApplication,
            "targetApplication",
            160,
          ),
        ),
        ...optionalField(
          "projectCommit",
          patchCommit(patch.projectCommit, current.use.projectCommit),
        ),
      },
      verdict: patch.verdict ?? current.verdict,
      ...optionalRating(
        patch.rating === undefined
          ? current.rating
          : patch.rating === null
            ? undefined
            : patch.rating,
      ),
      ...optionalField(
        "critique",
        patchText(patch.critique, current.critique, "critique", 4_000),
      ),
      ...optionalField(
        "correction",
        patchText(patch.correction, current.correction, "correction", 8_000),
      ),
      ...optionalField(
        "finalPrompt",
        patchText(
          patch.finalPrompt,
          current.finalPrompt,
          "finalPrompt",
          100_000,
        ),
      ),
      ...outcomeFields(outcomeStatus, outcomeSummary),
      ...optionalField(
        "notes",
        patchText(patch.notes, current.notes, "notes", 4_000),
      ),
    },
    current.filePath,
  );
  rejectSensitiveFeedback(record);
  await atomicWrite(current.filePath, serializeFeedback(record));
  return { ...record, filePath: current.filePath };
}

export async function deletePromptUseFeedback(
  promptDirectory: string,
  id: string,
): Promise<void> {
  const record = await getPromptUseFeedback(promptDirectory, id);
  await rm(record.filePath);
}

export function parseFeedback(
  source: string,
  filePath = "<memory>",
): PromptUseFeedbackRecord {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("Feedback record is not valid JSON.");
  }
  return {
    ...validateFeedbackRecord(value, filePath),
    filePath,
  };
}

export function serializeFeedback(
  record: PromptUseFeedbackRecord | Omit<PromptUseFeedbackRecord, "filePath">,
): string {
  return `${JSON.stringify(
    validateFeedbackRecord(
      withoutFilePath(record),
      "filePath" in record ? record.filePath : "<memory>",
    ),
    null,
    2,
  )}\n`;
}

export function exportPromptUseFeedback(
  records: readonly PromptUseFeedbackRecord[],
  format: FeedbackExportFormat,
): string {
  if (format === "json") {
    return `${JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        records: records.map(withoutFilePath),
      },
      null,
      2,
    )}\n`;
  }
  if (format !== "markdown") {
    throw new Error("Feedback export format must be json or markdown.");
  }
  const sections = records.map((record) => {
    const details = [
      `- Feedback ID: \`${record.id}\``,
      `- Prompt ID: \`${record.prompt.promptId}\``,
      `- Prompt version: ${record.prompt.promptUpdatedAt}`,
      `- Prompt digest: \`${record.prompt.sourceDigest}\``,
      `- Used: ${record.use.usedAt}`,
      `- Target agent: ${record.use.targetAgent}`,
      `- Verdict: ${record.verdict}`,
      ...(record.rating ? [`- Rating: ${record.rating}/5`] : []),
      ...(record.use.targetApplication
        ? [`- Application: ${record.use.targetApplication}`]
        : []),
      ...(record.use.projectCommit
        ? [`- Project commit: \`${record.use.projectCommit}\``]
        : []),
    ];
    return [
      `## ${record.prompt.title}`,
      details.join("\n"),
      `### Prompt Snapshot\n\n${record.prompt.body}`,
      ...(record.critique ? [`### Critique\n\n${record.critique}`] : []),
      ...(record.correction ? [`### Correction\n\n${record.correction}`] : []),
      ...(record.finalPrompt
        ? [`### Final Edited Prompt\n\n${record.finalPrompt}`]
        : []),
      ...(record.outcome
        ? [
            `### Outcome\n\nStatus: ${record.outcome.status}${record.outcome.summary ? `\n\n${record.outcome.summary}` : ""}`,
          ]
        : []),
      ...(record.notes ? [`### Notes\n\n${record.notes}`] : []),
    ].join("\n\n");
  });
  return `# Prompt Studio Feedback Export\n\n${sections.join("\n\n---\n\n")}\n`;
}

function validateFeedbackRecord(
  value: unknown,
  filePath: string,
): Omit<PromptUseFeedbackRecord, "filePath"> {
  if (!isObject(value)) throw new Error("Feedback record must be an object.");
  assertAllowedKeys(value, "feedback", [
    "schemaVersion",
    "id",
    "revision",
    "createdAt",
    "updatedAt",
    "prompt",
    "use",
    "verdict",
    "rating",
    "critique",
    "correction",
    "finalPrompt",
    "outcome",
    "notes",
  ]);
  if (value.schemaVersion !== FEEDBACK_SCHEMA_VERSION) {
    throw new Error("Unsupported feedback schema version.");
  }
  const id = requiredText(value.id, "id", 1, 64);
  if (!UUID.test(id)) throw new Error("Feedback id must be a UUID.");
  const revision = positiveInteger(value.revision, "revision");
  const createdAt = timestamp(value.createdAt, "createdAt");
  const updatedAt = timestamp(value.updatedAt, "updatedAt");
  const prompt = validateSnapshot(value.prompt);
  const use = validateUse(value.use);
  const verdict = enumValue(value.verdict, FEEDBACK_VERDICTS, "verdict");
  const result: Omit<PromptUseFeedbackRecord, "filePath"> = {
    schemaVersion: 1,
    id,
    revision,
    createdAt,
    updatedAt,
    prompt,
    use,
    verdict,
  };
  if (value.rating !== undefined) result.rating = rating(value.rating);
  if (value.critique !== undefined) {
    result.critique = requiredText(value.critique, "critique", 1, 4_000);
  }
  if (value.correction !== undefined) {
    result.correction = requiredText(value.correction, "correction", 1, 8_000);
  }
  if (value.finalPrompt !== undefined) {
    result.finalPrompt = requiredText(
      value.finalPrompt,
      "finalPrompt",
      1,
      100_000,
    );
  }
  if (value.outcome !== undefined)
    result.outcome = validateOutcome(value.outcome);
  if (value.notes !== undefined) {
    result.notes = requiredText(value.notes, "notes", 1, 4_000);
  }
  rejectSensitiveFeedback(result);
  if (basename(filePath) !== "<new>" && filePath !== "<memory>") {
    const expected = `${id}.json`;
    if (basename(filePath) !== expected) {
      throw new Error("Feedback filename does not match its identifier.");
    }
  }
  return result;
}

function validateSnapshot(value: unknown): FeedbackPromptSnapshot {
  if (!isObject(value)) throw new Error("prompt snapshot must be an object.");
  assertAllowedKeys(value, "prompt", [
    "promptId",
    "promptUpdatedAt",
    "sourceDigest",
    "snapshotDigest",
    "title",
    "summary",
    "body",
    "target",
    "tags",
    "aliases",
    "searchTerms",
    "enhancement",
    "project",
    "sources",
  ]);
  const promptId = requiredText(value.promptId, "prompt.promptId", 1, 64);
  if (!UUID.test(promptId)) throw new Error("prompt.promptId must be a UUID.");
  const sourceDigest = digest(value.sourceDigest, "prompt.sourceDigest");
  const snapshotDigest = digest(value.snapshotDigest, "prompt.snapshotDigest");
  const target = enumValue(
    value.target,
    ["generic", "codex", "claude-code"] as const,
    "prompt.target",
  );
  const snapshot: FeedbackPromptSnapshot = {
    promptId,
    promptUpdatedAt: timestamp(value.promptUpdatedAt, "prompt.promptUpdatedAt"),
    sourceDigest,
    snapshotDigest,
    title: requiredText(value.title, "prompt.title", 1, 200),
    summary: requiredText(value.summary, "prompt.summary", 1, 500),
    body: requiredText(value.body, "prompt.body", 1, 100_000),
    target,
    tags: textArray(value.tags, "prompt.tags", 50, 80),
    aliases: textArray(value.aliases, "prompt.aliases", 50, 160),
    searchTerms: textArray(value.searchTerms, "prompt.searchTerms", 100, 200),
  };
  if (value.enhancement !== undefined) {
    snapshot.enhancement = validateEnhancement(value.enhancement);
  }
  if (value.project !== undefined)
    snapshot.project = validateProject(value.project);
  if (value.sources !== undefined)
    snapshot.sources = validateSources(value.sources);
  const recomputed = digestSnapshot({
    ...snapshot,
    snapshotDigest: undefined,
  });
  if (recomputed !== snapshotDigest) {
    throw new Error("Prompt snapshot digest does not match its content.");
  }
  return snapshot;
}

function validateUse(value: unknown): PromptUseFeedbackRecord["use"] {
  if (!isObject(value)) throw new Error("use must be an object.");
  assertAllowedKeys(value, "use", [
    "usedAt",
    "targetAgent",
    "targetApplication",
    "projectCommit",
  ]);
  const use: PromptUseFeedbackRecord["use"] = {
    usedAt: timestamp(value.usedAt, "use.usedAt"),
    targetAgent: enumValue(
      value.targetAgent,
      FEEDBACK_TARGET_AGENTS,
      "use.targetAgent",
    ),
  };
  if (value.targetApplication !== undefined) {
    use.targetApplication = requiredText(
      value.targetApplication,
      "use.targetApplication",
      1,
      160,
    );
  }
  if (value.projectCommit !== undefined) {
    use.projectCommit = commit(value.projectCommit, "use.projectCommit");
  }
  return use;
}

function validateOutcome(
  value: unknown,
): NonNullable<PromptUseFeedbackRecord["outcome"]> {
  if (!isObject(value)) throw new Error("outcome must be an object.");
  assertAllowedKeys(value, "outcome", ["status", "summary"]);
  return {
    status: enumValue(
      value.status,
      FEEDBACK_OUTCOME_STATUSES,
      "outcome.status",
    ),
    ...(value.summary === undefined
      ? {}
      : {
          summary: requiredText(value.summary, "outcome.summary", 1, 4_000),
        }),
  };
}

function validateEnhancement(value: unknown): EnhancementProvenance {
  if (!isObject(value))
    throw new Error("prompt.enhancement must be an object.");
  assertAllowedKeys(value, "prompt.enhancement", [
    "provider",
    "profileId",
    "model",
    "reasoningEffort",
    "compilerVersion",
    "outputSchemaVersion",
    "generatedAt",
  ]);
  return {
    provider: enumValue(
      value.provider,
      ["openai", "anthropic", "google"] as const,
      "prompt.enhancement.provider",
    ),
    profileId: requiredText(
      value.profileId,
      "prompt.enhancement.profileId",
      1,
      160,
    ),
    model: requiredText(value.model, "prompt.enhancement.model", 1, 160),
    reasoningEffort: requiredText(
      value.reasoningEffort,
      "prompt.enhancement.reasoningEffort",
      1,
      80,
    ),
    compilerVersion: requiredText(
      value.compilerVersion,
      "prompt.enhancement.compilerVersion",
      1,
      160,
    ),
    outputSchemaVersion: positiveInteger(
      value.outputSchemaVersion,
      "prompt.enhancement.outputSchemaVersion",
    ),
    generatedAt: timestamp(value.generatedAt, "prompt.enhancement.generatedAt"),
  };
}

function validateProject(
  value: unknown,
): NonNullable<FeedbackPromptSnapshot["project"]> {
  if (!isObject(value)) throw new Error("prompt.project must be an object.");
  assertAllowedKeys(value, "prompt.project", ["name", "branch", "commit"]);
  return {
    name: requiredText(value.name, "prompt.project.name", 1, 200),
    ...(value.branch === undefined
      ? {}
      : {
          branch: requiredText(value.branch, "prompt.project.branch", 1, 300),
        }),
    ...(value.commit === undefined
      ? {}
      : { commit: commit(value.commit, "prompt.project.commit") }),
  };
}

function validateSources(value: unknown): PromptSource[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("prompt.sources must contain at most 100 records.");
  }
  return value.map((source, index) => {
    if (!isObject(source)) {
      throw new Error(`prompt.sources[${index}] must be an object.`);
    }
    assertAllowedKeys(source, `prompt.sources[${index}]`, [
      "title",
      "url",
      "retrievedAt",
      "supports",
    ]);
    return {
      title: requiredText(
        source.title,
        `prompt.sources[${index}].title`,
        1,
        500,
      ),
      retrievedAt: timestamp(
        source.retrievedAt,
        `prompt.sources[${index}].retrievedAt`,
      ),
      ...(source.url === undefined
        ? {}
        : {
            url: requiredText(
              source.url,
              `prompt.sources[${index}].url`,
              1,
              2_000,
            ),
          }),
      ...(source.supports === undefined
        ? {}
        : {
            supports: textArray(
              source.supports,
              `prompt.sources[${index}].supports`,
              100,
              500,
            ),
          }),
    };
  });
}

function outcomeFields(
  status: FeedbackOutcomeStatus | undefined,
  summary: string | undefined,
): { outcome?: NonNullable<PromptUseFeedbackRecord["outcome"]> } {
  const normalizedSummary = optionalText(summary, "outcomeSummary", 1, 4_000);
  if (!status && !normalizedSummary) return {};
  if (!status) {
    throw new Error("outcomeStatus is required when outcomeSummary is set.");
  }
  return {
    outcome: {
      status,
      ...(normalizedSummary ? { summary: normalizedSummary } : {}),
    },
  };
}

function optionalRating(value: number | undefined): { rating?: number } {
  return value === undefined ? {} : { rating: rating(value) };
}

function rating(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    throw new Error("rating must be an integer from 1 to 5.");
  }
  return Number(value);
}

function digest(value: unknown, field: string): string {
  const result = requiredText(value, field, 64, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) {
    throw new Error(`${field} must be 64 lowercase hexadecimal characters.`);
  }
  return result;
}

function commit(value: unknown, field: string): string {
  const result = requiredText(value, field, 4, 64);
  if (!/^[a-f0-9]{4,64}$/i.test(result)) {
    throw new Error(`${field} must be a Git commit identifier.`);
  }
  return result;
}

function optionalCommit(
  value: string | undefined,
  field: string,
): string | undefined {
  return value?.trim() ? commit(value, field) : undefined;
}

function patchCommit(
  value: string | null | undefined,
  fallback: string | undefined,
): string | undefined {
  if (value === undefined) return fallback;
  if (value === null || !value.trim()) return undefined;
  return commit(value, "projectCommit");
}

function timestamp(value: unknown, field: string): string {
  const result = requiredText(value, field, 1, 100);
  if (!Number.isFinite(Date.parse(result))) {
    throw new Error(`${field} must be an ISO timestamp.`);
  }
  return result;
}

function optionalTimestamp(
  value: string | undefined,
  field: string,
): string | undefined {
  return value?.trim() ? timestamp(value, field) : undefined;
}

function requiredText(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const result = value.trim();
  if (result.length < minimum || result.length > maximum) {
    throw new Error(`${field} must contain ${minimum}-${maximum} characters.`);
  }
  return result;
}

function optionalText(
  value: string | undefined,
  field: string,
  minimum: number,
  maximum: number,
): string | undefined {
  return value?.trim()
    ? requiredText(value, field, minimum, maximum)
    : undefined;
}

function patchText(
  value: string | null | undefined,
  fallback: string | undefined,
  field: string,
  maximum: number,
): string | undefined {
  if (value === undefined) return fallback;
  if (value === null || !value.trim()) return undefined;
  return requiredText(value, field, 1, maximum);
}

function textArray(
  value: unknown,
  field: string,
  maximum: number,
  itemMaximum: number,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length > maximum ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim() ||
        item.trim().length > itemMaximum,
    )
  ) {
    throw new Error(`${field} must be a bounded array of non-empty text.`);
  }
  return value.map((item) => item.trim());
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw new Error(`${field} is not supported.`);
  }
  return value as T[number];
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return Number(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new Error(`${field} contains unknown field: ${unknown}.`);
}

function optionalField<K extends string, V>(
  key: K,
  value: V | undefined,
): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]: V });
}

function withoutFilePath(
  record: PromptUseFeedbackRecord | Omit<PromptUseFeedbackRecord, "filePath">,
): Omit<PromptUseFeedbackRecord, "filePath"> {
  const value = { ...record } as Record<string, unknown>;
  delete value.filePath;
  return value as unknown as Omit<PromptUseFeedbackRecord, "filePath">;
}

function digestSnapshot(
  value:
    | Record<string, unknown>
    | Omit<FeedbackPromptSnapshot, "snapshotDigest">,
): string {
  const normalized = { ...value } as Record<string, unknown>;
  delete normalized.snapshotDigest;
  return createHash("sha256").update(canonicalJson(normalized)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Feedback contains a non-finite number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .flatMap((key) =>
        value[key] === undefined
          ? []
          : [`${JSON.stringify(key)}:${canonicalJson(value[key])}`],
      )
      .join(",")}}`;
  }
  throw new Error("Feedback contains a non-JSON value.");
}

function rejectSensitiveFeedback(
  record: PromptUseFeedbackRecord | Omit<PromptUseFeedbackRecord, "filePath">,
): void {
  if (containsLikelySecret(JSON.stringify(withoutFilePath(record)))) {
    throw new Error(
      "Feedback appears to contain a secret. Replace it with a placeholder before saving.",
    );
  }
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFile(error: unknown): boolean {
  return isObject(error) && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
