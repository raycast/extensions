/**
 * Pure helpers for building Delta CLI arguments and parsing its output.
 * Nothing here touches Raycast or the file system, so it's covered by unit tests.
 * The CLI is in beta and its output can change between releases; keep parsing tolerant.
 */
import { DeltaUpdateCheck, QueryResult, QuerySource, Visibility } from "./types";

export function buildCreateThreadArgs(options: {
  prompt: string;
  organizationId?: string;
  visibility: Visibility;
}): string[] {
  // `--prompt=` keeps prompts that start with "-" from being parsed as flags.
  const args = ["thread", "create", `--prompt=${options.prompt}`, "--visibility", options.visibility];
  if (options.organizationId) {
    args.push("--organization", options.organizationId);
  }
  return args;
}

/** Why a Delta call failed, so every screen can explain it the same way. */
export type DeltaErrorKind =
  | "not-installed"
  | "not-signed-in"
  | "timeout"
  | "vague-question"
  | "no-matching-threads"
  | "unreadable-thread"
  | "thread-not-found"
  | "model-unavailable"
  | "unexpected-output"
  | "other";

const ERROR_MESSAGES: Record<Exclude<DeltaErrorKind, "other">, string> = {
  "not-installed": "Delta is not installed",
  "not-signed-in": "Sign in to Delta, then try again",
  timeout: "Delta took too long to respond",
  "vague-question": "Add a specific word to the question, like a project, feature or file name",
  "no-matching-threads": "No thread mentions the words in your question",
  "unreadable-thread": "Delta can't load this thread's history",
  "thread-not-found": "Delta doesn't have this thread anymore",
  "model-unavailable": "Delta couldn't reach a model. Check your Delta plan or model settings, then try again",
  "unexpected-output": "Delta returned something this extension can't read. Update Delta and the extension",
};

/** The one error type for everything that goes wrong between the extension and Delta. */
export class DeltaError extends Error {
  constructor(
    readonly kind: DeltaErrorKind,
    /** Delta's own words; used as the message when the kind is "other". */
    detail?: string,
  ) {
    super(kind === "other" ? detail || "Delta failed" : ERROR_MESSAGES[kind]);
    this.name = "DeltaError";
  }
}

export function isDeltaError(error: unknown, kind?: DeltaErrorKind): error is DeltaError {
  return error instanceof DeltaError && (!kind || error.kind === kind);
}

/** Recognizes the failures worth a clearer explanation than Delta's own message (Delta 0.25.0 wording). */
export function classifyCliError(message: string): DeltaErrorKind {
  if (/no threads matched/i.test(message)) {
    return "no-matching-threads";
  }
  // Some threads, such as imported recordings, have no history Delta can replay.
  if (/holds no deltas/i.test(message)) {
    return "unreadable-thread";
  }
  if (/^thread .* not found$/i.test(message)) {
    return "thread-not-found";
  }
  // Model access is tied to the account's plan.
  if (/\b402\b|payment required/i.test(message)) {
    return "model-unavailable";
  }
  return "other";
}

/** `delta auth status --json` prints `{"status": "signed_in", "account": {...}}`. Undefined when it can't be read. */
export function parseSignedIn(stdout: string): boolean | undefined {
  try {
    const status = (JSON.parse(stdout) as { status?: unknown }).status;
    return typeof status === "string" ? status === "signed_in" : undefined;
  } catch {
    return undefined;
  }
}

// Words that say nothing about a topic and would match nearly every thread. English and Russian,
// the languages the questions and threads are written in.
const STOP_WORDS = new Set([
  ...["what", "which", "when", "where", "who", "whom", "why", "how", "did", "does", "doing", "done", "was", "were"],
  ...["are", "is", "the", "and", "for", "with", "this", "that", "these", "those", "there", "about", "from", "into"],
  ...["have", "has", "had", "our", "your", "you", "can", "could", "should", "would", "will", "any", "all", "not"],
  ...["they", "them", "their", "its", "been", "being", "but", "than", "then", "also", "just", "some"],
  ...["tell", "show", "give", "find", "remind", "please", "summarize", "summary", "thread", "threads"],
  ...["что", "как", "где", "когда", "почему", "зачем", "какой", "какая", "какие", "каким", "кто", "это", "этот"],
  ...["эта", "эти", "для", "про", "мы", "нас", "наш", "нашем", "был", "была", "были", "было", "есть", "или"],
  ...["тут", "там", "уже", "ещё", "еще", "все", "всё", "так", "его", "она", "они", "мне", "меня", "надо"],
  ...["мой", "моя", "мои", "моё", "чем", "чего", "чему", "кого", "кому", "если", "чтобы", "тоже", "также"],
  ...["может", "можно", "нужно", "будет", "быть", "при", "над", "под", "без", "после", "перед", "между", "через"],
  ...["этом", "этой", "этих", "того", "тот", "тем", "них", "ним", "вам", "вас", "тебя", "тебе", "какую", "каких"],
  ...["расскажи", "покажи", "напомни", "подскажи", "скажи", "найди", "пожалуйста", "тред", "треды", "тредах"],
]);

// Longest first, so "ключами" loses "ами" rather than just "и".
const RUSSIAN_ENDINGS = [
  ...["иями", "ями", "ами", "ией", "иях", "иям", "ого", "его", "ому", "ему", "ыми", "ими"],
  ...["ах", "ях", "ам", "ям", "ом", "ем", "ев", "ов", "ей", "ой", "ий", "ый", "ая", "яя", "ое", "ее", "ые", "ие"],
  ...["ую", "юю", "ия", "ию", "ии", "а", "я", "ы", "и", "у", "ю", "е", "о", "ь"],
];

/**
 * Cuts a word down to the part its other forms share. Delta matches keywords as substrings, so
 * "ключ" finds "ключи" and "ключей" while "ключей" finds neither, and "test" finds "tests".
 * Deliberately light: a stem that is too short would match unrelated words.
 */
export function stemKeyword(word: string): string {
  if (/^[а-яё]{5,}$/.test(word)) {
    const ending = RUSSIAN_ENDINGS.find((candidate) => word.endsWith(candidate) && word.length - candidate.length >= 4);
    return ending ? word.slice(0, -ending.length) : word;
  }
  if (/^[a-z]{4,}ies$/.test(word)) {
    return word.slice(0, -3);
  }
  if (/^[a-z]{3,}s$/.test(word) && !/(ss|us|is)$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

const MAX_KEYWORDS = 12;

/** The question's meaningful words, stemmed, in order and without duplicates. Empty when it has none. */
export function extractKeywords(question: string): string[] {
  const words = (question.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}._/-]*/gu) ?? [])
    .map((word) => word.replace(/[._/-]+$/, ""))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stemKeyword);
  return [...new Set(words)].slice(0, MAX_KEYWORDS);
}

/**
 * Turns a question into one `--keyword` group: its keywords joined with `|`, so a thread
 * matching any of them is considered. Returns undefined when nothing specific is left.
 */
export function buildKeywordGroup(question: string): string | undefined {
  const keywords = extractKeywords(question);
  return keywords.length > 0 ? keywords.join("|") : undefined;
}

export class QuestionTooVagueError extends DeltaError {
  constructor() {
    super("vague-question");
    this.name = "QuestionTooVagueError";
  }
}

/**
 * `delta thread query` refuses to run without a filter. With `threadId` (one ID or several) Delta
 * answers from those threads; otherwise from threads matching the question's meaningful words. Without `model`, Delta
 * uses the default model of the account's model registry.
 */
export function buildQueryArgs(
  question: string,
  options: { threadId?: string | string[]; model?: string } = {},
): string[] {
  const { model } = options;
  const threadIds = [options.threadId ?? []].flat();
  let scope: string[];
  if (threadIds.length > 0) {
    scope = threadIds.flatMap((id) => ["--thread", id]);
  } else {
    const keywords = buildKeywordGroup(question);
    if (!keywords) {
      throw new QuestionTooVagueError();
    }
    scope = ["--keyword", keywords];
  }
  if (model) {
    scope.push("--model", model);
  }
  // `--` keeps questions that start with "-" from being parsed as flags.
  return ["thread", "query", ...scope, "--", question];
}

/** Delta prints diagnostics on stderr; the last non-empty line is the actual error. */
export function parseCliError(stderr: string, fallback: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (lines.at(-1) ?? fallback).replace(/^(delta|error):\s*/i, "");
}

/** The error to show for a failed CLI call, given what it printed on stderr. */
export function toDeltaError(stderr: string, fallback: string): DeltaError {
  const message = parseCliError(stderr, fallback);
  return new DeltaError(classifyCliError(message), message);
}

/** `thread create --json` isn't a documented contract, so look for the ID defensively. */
export function findThreadId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value || undefined;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["thread_id", "id"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate) {
      return candidate;
    }
  }
  for (const key of ["thread", "result"]) {
    const nested = findThreadId(record[key]);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

/** Delta prints timestamps as `2026-11-09 17:41:52 UTC`. */
export function parseDeltaDate(value: string): Date | undefined {
  const date = new Date(value.replace(" UTC", "Z").replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isQuerySource(value: unknown): value is { id: string; name?: unknown } {
  return !!value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string";
}

/**
 * `thread query` prints `{"answer": "...", "sources": [{"id", "name", "index"}]}` (Delta 0.25.0).
 * Falls back to treating the output as plain text if that ever changes.
 */
export function parseQueryResult(stdout: string): QueryResult {
  const text = stdout.trim();
  try {
    const parsed = JSON.parse(text) as { answer?: unknown; sources?: unknown };
    if (typeof parsed?.answer === "string") {
      const sources: QuerySource[] = (Array.isArray(parsed.sources) ? parsed.sources : [])
        .filter(isQuerySource)
        .map((source) => ({
          id: source.id,
          name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Untitled Thread",
        }));
      return { answer: parsed.answer.trim(), sources };
    }
  } catch {
    // Not JSON: plain-text answer.
  }
  return { answer: text, sources: [] };
}

export interface ModelUsage {
  /** `provider/model-id`, the format `--model` expects. */
  id: string;
  uses: number;
}

// `delta --debug thread data` records each agent's model as {"provider": "...", "model": "..."}.
// Matched as text: the output is tens of megabytes, far too big to parse as JSON in Raycast.
const MODEL_ENTRY_PATTERNS: { pattern: RegExp; provider: number; model: number }[] = [
  { pattern: /"model":\s*\{\s*"provider":\s*"([^"\\]+)",\s*"model":\s*"([^"\\]+)"\s*\}/g, provider: 1, model: 2 },
  { pattern: /"model":\s*\{\s*"model":\s*"([^"\\]+)",\s*"provider":\s*"([^"\\]+)"\s*\}/g, provider: 2, model: 1 },
];

/**
 * Adds the models `text` mentions to `counts`. Matches ending at or before `skipBefore` are
 * ignored; `ModelUseScanner` uses that for text it already scanned.
 */
export function countModelUses(text: string, counts = new Map<string, number>(), skipBefore = 0): Map<string, number> {
  for (const { pattern, provider, model } of MODEL_ENTRY_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match.index + match[0].length <= skipBefore) {
        continue;
      }
      const id = `${match[provider]}/${match[model]}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Longer than any model entry, so an entry split across two chunks is still found whole. */
const SCANNER_OVERLAP = 4096;

/**
 * Counts models in a stream of text chunks while holding only one chunk plus a small overlap in
 * memory, so a thread's tens of megabytes never sit in the command's 100 MB heap at once.
 */
export class ModelUseScanner {
  readonly counts = new Map<string, number>();
  private overlap = "";

  push(chunk: string): void {
    const text = this.overlap + chunk;
    countModelUses(text, this.counts, this.overlap.length);
    this.overlap = text.slice(-SCANNER_OVERLAP);
  }
}

/** Most used first; ties sorted by name so the list is stable. */
export function rankModels(counts: Map<string, number>): ModelUsage[] {
  return [...counts].map(([id, uses]) => ({ id, uses })).sort((a, b) => b.uses - a.uses || a.id.localeCompare(b.id));
}

/** A typed custom model must look like `provider/model-id`. */
export function isModelId(text: string): boolean {
  return /^[\w.-]+\/\S+$/.test(text.trim());
}

/** Splits a comma, semicolon or whitespace separated list of emails, dropping duplicates. */
export function parseEmails(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

/**
 * `delta update --check --json` prints JSON Lines: progress records, then one result such as
 * `{"status":"up_to_date","current_version":"0.25.0","latest_version":"0.25.0","can_install":true}`.
 */
export function parseUpdateCheck(stdout: string): DeltaUpdateCheck | undefined {
  const lines = stdout.split("\n").filter((line) => line.trim());
  for (const line of lines.reverse()) {
    try {
      const record = JSON.parse(line) as Record<string, unknown>;
      if (typeof record.status === "string") {
        return {
          status: record.status,
          currentVersion: typeof record.current_version === "string" ? record.current_version : "",
          latestVersion: typeof record.latest_version === "string" ? record.latest_version : "",
          canInstall: record.can_install === true,
        };
      }
    } catch {
      // Not a JSON record; keep looking.
    }
  }
  return undefined;
}

export function isUpdateAvailable(check: DeltaUpdateCheck | undefined): check is DeltaUpdateCheck {
  return (
    !!check && check.status !== "up_to_date" && !!check.latestVersion && check.latestVersion !== check.currentVersion
  );
}

/** Whether something saved at `savedAt` (epoch ms) is recent enough to reuse instead of asking Delta again. */
export function isFresh(savedAt: number | undefined, maxAgeMs: number, now = Date.now()): boolean {
  return savedAt !== undefined && now - savedAt >= 0 && now - savedAt < maxAgeMs;
}

/** Adds `--json`, keeping it before a `--` separator so it isn't read as a positional argument. */
export function withJsonFlag(args: string[]): string[] {
  const separator = args.indexOf("--");
  return separator === -1 ? [...args, "--json"] : [...args.slice(0, separator), "--json", ...args.slice(separator)];
}
