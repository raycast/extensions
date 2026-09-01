import { execFile } from "child_process";
import { access, constants } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { promisify } from "util";
import { MetaRecord, TemplateKind } from "./types";
import { FIELDS_BY_KIND, normalizeStoredValue } from "./fields";
import { getCredentials } from "./storage";

const execFileAsync = promisify(execFile);

const EXTRA_PATHS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  join(homedir(), ".local/bin"),
  join(homedir(), "Library/Python/3.13/bin"),
  join(homedir(), "Library/Python/3.12/bin"),
  join(homedir(), "Library/Python/3.11/bin"),
  join(homedir(), ".pyenv/shims"),
  "/usr/bin",
];

export class CliError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly code: number | null,
  ) {
    super(message);
    this.name = "CliError";
  }
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveMetaBin(preferred?: string): Promise<string> {
  if (preferred && (await isExecutable(preferred))) {
    return preferred;
  }

  const candidates = [
    preferred,
    "/opt/homebrew/bin/meta",
    "/usr/local/bin/meta",
    join(homedir(), ".local/bin/meta"),
    join(homedir(), "Library/Python/3.13/bin/meta"),
    join(homedir(), "Library/Python/3.12/bin/meta"),
    join(homedir(), "Library/Python/3.11/bin/meta"),
    join(homedir(), ".pyenv/shims/meta"),
  ].filter((path): path is string => Boolean(path));

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", "command -v meta"], { timeout: 8000 });
    const found = stdout.trim();
    if (found && (await isExecutable(found))) {
      return found;
    }
  } catch {
    // fall through
  }

  throw new Error("meta CLI를 찾을 수 없습니다. `pip install meta-ads` 후 자격 증명에 CLI 경로를 넣어 주세요.");
}

function parseJson(stdout: string): unknown {
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function asRecords(parsed: unknown): MetaRecord[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is MetaRecord => Boolean(item && typeof item === "object" && "id" in item));
  }
  if (typeof parsed === "object" && parsed !== null) {
    const maybeData = (parsed as { data?: unknown }).data;
    if (Array.isArray(maybeData)) {
      return asRecords(maybeData);
    }
    if ("id" in parsed) {
      return [parsed as MetaRecord];
    }
  }
  return [];
}

export interface RunResult {
  stdout: string;
  parsed: unknown;
}

export interface RunMetaOptions {
  timeoutMs?: number;
  accessToken?: string;
  adAccountId?: string;
  requireAdAccount?: boolean;
}

export async function runMeta(args: string[], options?: RunMetaOptions): Promise<RunResult> {
  const stored = await getCredentials();
  const accessToken = (options?.accessToken ?? stored?.accessToken ?? "").trim();
  const adAccountId = options?.adAccountId ?? stored?.adAccountId ?? "";
  const requireAdAccount = options?.requireAdAccount !== false;

  if (!accessToken) {
    throw new Error("ACCESS_TOKEN을 먼저 저장하세요.");
  }
  if (requireAdAccount && !adAccountId) {
    throw new Error("ACCESS_TOKEN과 광고 계정 ID를 먼저 저장하세요.");
  }

  const bin = await resolveMetaBin(stored?.metaCliPath);
  const env = {
    ...process.env,
    ACCESS_TOKEN: accessToken,
    AD_ACCOUNT_ID: adAccountId,
    PATH: [dirname(bin), ...EXTRA_PATHS, process.env.PATH ?? ""].join(":"),
  };

  const cliArgs = ["--no-input", "--no-color", "--output", "json", "ads", ...args];

  try {
    const { stdout, stderr } = await execFileAsync(bin, cliArgs, {
      env,
      timeout: options?.timeoutMs ?? 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr?.trim()) {
      console.error(stderr);
    }
    return { stdout, parsed: parseJson(stdout) };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    const detail = (err.stderr || err.stdout || err.message || "unknown error").trim();
    throw new CliError(detail.slice(0, 1500), err.stderr ?? "", err.code ?? null);
  }
}

export function serializeFormValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.filter(Boolean).join("\n");
  if (typeof value === "boolean") return value ? "true" : "";
  return String(value).trim();
}

export function buildCreateArgs(
  kind: TemplateKind,
  values: Record<string, string>,
): { positional?: string; args: string[] } {
  const fields = FIELDS_BY_KIND[kind];
  const positionalField = fields.find((field) => field.positional);
  const positional = positionalField ? values[positionalField.id] : undefined;
  const args: string[] = [];

  for (const field of fields) {
    if (field.positional) continue;
    const value = normalizeStoredValue(field, values[field.id] ?? "");
    if (!value) continue;
    args.push(field.flag, value);
  }

  return { positional, args };
}

export function previewCreateCommand(kind: TemplateKind, values: Record<string, string>): string {
  const { positional, args } = buildCreateArgs(kind, values);
  const parts = ["meta", "ads", kind, "create"];
  if (positional) parts.push(positional);
  parts.push(...args);
  return parts.map((part) => (part.includes(" ") ? `"${part}"` : part)).join(" ");
}

export async function createEntity(
  kind: TemplateKind,
  values: Record<string, string>,
): Promise<{ id?: string; raw: string }> {
  const { positional, args } = buildCreateArgs(kind, values);
  const cliArgs = [kind, "create"];
  if (positional) cliArgs.push(positional);
  cliArgs.push(...args);

  const { stdout, parsed } = await runMeta(cliArgs, { timeoutMs: 90_000 });
  const record = asRecords(parsed)[0];
  return { id: record?.id, raw: stdout.trim() };
}

function recordsFromResult(parsed: unknown, stdout: string): MetaRecord[] {
  const records = asRecords(parsed);
  if (records.length > 0) return records;
  if (typeof parsed === "string" && parsed.trim()) {
    throw new Error(parsed.slice(0, 800));
  }
  if (!stdout.trim()) return [];
  return [];
}

export async function listResource(
  resource: "campaign" | "adset" | "ad" | "creative" | "page" | "adaccount",
  parentId?: string,
  limit = 50,
): Promise<MetaRecord[]> {
  const args = [resource, "list"];
  if (parentId) args.push(parentId);
  args.push("--limit", String(limit));
  const { parsed, stdout } = await runMeta(args);
  return recordsFromResult(parsed, stdout);
}

export async function listAdAccounts(accessToken: string, limit = 50): Promise<MetaRecord[]> {
  const { parsed, stdout } = await runMeta(["adaccount", "list", "--limit", String(limit)], {
    accessToken,
    requireAdAccount: false,
  });
  return recordsFromResult(parsed, stdout);
}

export async function deleteResource(resource: "campaign" | "adset" | "ad" | "creative", id: string): Promise<void> {
  await runMeta([resource, "delete", id, "--force"]);
}

export interface CreativeCreateInput {
  name: string;
  pageId: string;
  image?: string;
  video?: string;
  images?: string[];
  videos?: string[];
  body?: string;
  title?: string;
  linkUrl?: string;
  description?: string;
  callToAction?: string;
  bodies?: string[];
  titles?: string[];
  descriptions?: string[];
  callToActions?: string[];
  instagramActorId?: string;
}

function pushRepeat(args: string[], flag: string, values?: string[]) {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed) args.push(flag, trimmed);
  }
}

export function buildCreativeArgs(input: CreativeCreateInput): string[] {
  const args = ["creative", "create", "--name", input.name, "--page-id", input.pageId];
  const isDco = Boolean(input.images?.length || input.videos?.length);

  if (isDco) {
    if (!input.linkUrl) {
      throw new Error("Dynamic Creative는 도착 URL(--link-url)이 필요합니다.");
    }
    args.push("--link-url", input.linkUrl);
    pushRepeat(args, "--images", input.images);
    pushRepeat(args, "--videos", input.videos);
    pushRepeat(args, "--titles", input.titles);
    pushRepeat(args, "--bodies", input.bodies);
    pushRepeat(args, "--descriptions", input.descriptions);
    pushRepeat(args, "--call-to-actions", input.callToActions);
  } else {
    if (input.image) args.push("--image", input.image);
    if (input.video) args.push("--video", input.video);
    if (input.body) args.push("--body", input.body);
    if (input.title) args.push("--title", input.title);
    if (input.linkUrl) args.push("--link-url", input.linkUrl);
    if (input.description) args.push("--description", input.description);
    if (input.callToAction) args.push("--call-to-action", input.callToAction);
  }

  if (input.instagramActorId) {
    args.push("--instagram-actor-id", input.instagramActorId);
  }

  return args;
}

export function previewCreativeCommand(input: CreativeCreateInput): string {
  return ["meta", "ads", ...buildCreativeArgs(input)]
    .map((part) => (part.includes(" ") ? `"${part}"` : part))
    .join(" ");
}

export async function createCreative(input: CreativeCreateInput): Promise<{ id?: string; raw: string }> {
  const args = buildCreativeArgs(input);
  const { stdout, parsed } = await runMeta(args, { timeoutMs: 180_000 });
  const record = asRecords(parsed)[0];
  return { id: record?.id, raw: stdout.trim() };
}

export { asRecords };
