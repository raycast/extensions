import { createHash, randomUUID } from "node:crypto";
import { isFinished, platformName, writtenVariants, type WrittenVariant } from "./format";
import { McpHttpError, McpNetworkError, McpToolError, isTransient, retryAfterMs, type CallOptions } from "./mcp";
import type { KeyValueStorage } from "./refresh";
import { CONNECTION_RENEWED_TOOL, ConnectionRenewedError } from "./session";
import type { TextGeneration, WritingPlatform } from "./types";

export const POLL_INTERVAL_MS = 2_000;
export const WRITE_TIMEOUT_MS = 120_000;
export const MAX_BACKOFF_MS = 60_000;
export const GENERATE_TIMEOUT_MS = 60_000;
export const PENDING_WRITE_TTL_MS = 30 * 60_000;
export const MAX_PENDING_WRITES = 10;
export const PENDING_WRITE_PREFIX = "pending-write-";
export const WRITE_RESERVE_CREDITS = 3;

const SETTLE_MIN_MS = 150;
const SETTLE_SPREAD_MS = 250;
const SETTLE_CHECKS = 2;
const IN_PROGRESS_RETRIES = 5;
const IN_PROGRESS_WAIT_MS = 1_000;
const LATE_POLLS = 2;
const LATE_POLL_WAIT_MS = 1_000;

export const MISSING_BRIEF = "Give a brief to write a new post, or the textGenerationId of a write to check on.";

export const UNKNOWN_OUTCOME_NOTE =
  "SocialFaktory may still be writing this post. Call write-post again within 30 minutes with the same brandId, platform and brief to check on it. That reuses the same request, so it does not spend credits again, unless you signed in again in between.";

export const FAILED_WRITE_NOTE =
  "SocialFaktory could not write this post. Call write-post again with the same brief to try once more; that is a new write and reserves 3 credits.";

export const UNREACHABLE_TITLE = "Could not reach SocialFaktory";
export const UNREACHABLE_ADVICE = "Check your connection, then use Check Again.";
export const UNREACHABLE_CHECK_AGAIN = `${UNREACHABLE_TITLE}. ${UNREACHABLE_ADVICE}`;
export const NO_RECENT_POST = "No post from the last 30 minutes to check.";
export const NO_POST_SINCE_SIGN_IN = "No post to check since you last signed in.";

export const UNREACHABLE_TOOL_NOTE =
  "Could not reach SocialFaktory. Check the connection, then call write-post again with this textGenerationId and brandId and no brief.";

export const STILL_WRITING_NOTE =
  "SocialFaktory is still writing. Share the variants written so far. To check again without spending credits, call write-post with this textGenerationId and brandId and no brief.";

export type WriteRequest = {
  brandId: string;
  brief: string;
  platform: WritingPlatform;
  idempotencyKey?: string;
  reused?: boolean;
};

export type WriteRecord = {
  key: string;
  brandId: string;
  platform: WritingPlatform;
  brief: string;
  startedAt: number;
  account: string;
  textGenerationId?: string;
  finished?: boolean;
};

export type WriteTarget = {
  brandId: string;
  textGenerationId: string;
  platform?: WritingPlatform;
};

export type PolledWrite = Omit<TextGeneration, "platform"> & { platform?: WritingPlatform; unreachable?: boolean };

export type WriteStorage = KeyValueStorage & {
  allItems(): Promise<Record<string, string>>;
};

export type WriteDependencies = {
  call<T>(name: string, args: Record<string, unknown>, options?: CallOptions): Promise<T>;
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  random(): number;
  storage: WriteStorage;
  signIn(): Promise<void>;
  account(): Promise<string>;
  sent: Map<string, string>;
};

export type PollOptions = {
  onProgress?: (generation: TextGeneration) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ToolInput = {
  brandId: string;
  brief?: string;
  platform?: WritingPlatform;
  textGenerationId?: string;
};

export type ToolResult = {
  status: string;
  brandId?: string;
  textGenerationId?: string;
  platform?: WritingPlatform;
  variants?: WrittenVariant[];
  note?: string;
};

export function mayStillBeRunning(error: unknown): boolean {
  if (error instanceof McpToolError) return error.kind === "idempotency_in_progress";
  if (error instanceof McpNetworkError) return !error.unsent;
  if (error instanceof McpHttpError) return isTransient(error);
  return (error as { name?: unknown } | undefined)?.name === "AbortError";
}

export function retryRequest(request: WriteRequest, error: unknown): WriteRequest {
  return mayStillBeRunning(error) ? request : { ...request, idempotencyKey: randomUUID() };
}

export function requestFrom(record: WriteRecord): WriteRequest {
  return {
    brandId: record.brandId,
    brief: record.brief,
    platform: record.platform,
    idempotencyKey: record.key,
    reused: true,
  };
}

export function targetFrom(record: WriteRecord & { textGenerationId: string }): WriteTarget {
  return { brandId: record.brandId, textGenerationId: record.textGenerationId, platform: record.platform };
}

export async function loadWrite(dependencies: WriteDependencies): Promise<WriteRecord | undefined> {
  const account = await signedInAccount(dependencies);
  const live = (await readEntries(dependencies)).filter((entry) => entry.account === account);
  return live.sort((a, b) => b.startedAt - a.startedAt)[0];
}

export async function lastWriteOrMessage(dependencies: WriteDependencies): Promise<WriteRecord | string> {
  const account = await signedInAccount(dependencies);
  const live = await readEntries(dependencies);
  const mine = live.filter((entry) => entry.account === account).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (mine) return mine;
  return live.length > 0 ? NO_POST_SINCE_SIGN_IN : NO_RECENT_POST;
}

export async function findSameWrite(
  dependencies: WriteDependencies,
  input: ToolInput,
  options: { signIn?: boolean } = {},
): Promise<WriteRecord | undefined> {
  if (input.textGenerationId) return undefined;
  const account = options.signIn === false ? await dependencies.account() : await signedInAccount(dependencies);
  return readEntry(dependencies, slotFor(account, requestOf(input)));
}

export function confirmationFor(input: ToolInput, brandName: string | undefined) {
  return {
    message: `Write post variants${brandName ? ` for ${brandName}` : ""}? This reserves ${WRITE_RESERVE_CREDITS} SocialFaktory credits.`,
    info: [
      { name: "Brand", value: brandName },
      { name: "Platform", value: platformName(input.platform ?? "x") },
      { name: "Credits Reserved", value: String(WRITE_RESERVE_CREDITS) },
      { name: "Brief", value: input.brief?.trim() },
    ],
  };
}

export async function startWrite(
  dependencies: WriteDependencies,
  request: WriteRequest,
  signal?: AbortSignal,
): Promise<WriteRecord & { textGenerationId: string }> {
  const account = await signedInAccount(dependencies);
  const slot = slotFor(account, request);
  const existing = await readEntry(dependencies, slot);
  if (existing?.textGenerationId) return { ...existing, textGenerationId: existing.textGenerationId };
  const candidate = existing?.key ?? request.idempotencyKey;
  const sentUnder = candidate ? dependencies.sent.get(candidate) : undefined;
  if (sentUnder && sentUnder !== account) throw new ConnectionRenewedError();
  const pending: WriteRecord = {
    key: candidate ?? randomUUID(),
    brandId: request.brandId,
    platform: request.platform,
    brief: request.brief.trim(),
    startedAt: dependencies.now(),
    account,
  };
  await saveEntry(dependencies, slot, pending);
  const settled = await settledKey(dependencies, slot, pending.key);
  const fresh = !existing && !request.reused && settled === pending.key && !dependencies.sent.has(settled);
  pending.key = settled;
  dependencies.sent.set(settled, account);

  let answer: { text_generation_id: string };
  try {
    answer = await generate(dependencies, pending, signal, fresh);
  } catch (error) {
    if (!mayStillBeRunning(error)) await clearEntry(dependencies, slot, pending.key);
    throw error;
  }

  const started = { ...pending, textGenerationId: answer.text_generation_id };
  await saveEntry(dependencies, slot, started);
  return started;
}

export async function pollWrite(
  dependencies: WriteDependencies,
  target: WriteTarget,
  options: PollOptions = {},
): Promise<PolledWrite> {
  const deadline = dependencies.now() + (options.timeoutMs ?? WRITE_TIMEOUT_MS);
  let generation: PolledWrite = {
    id: target.textGenerationId,
    status: "pending",
    platform: target.platform,
    mode: "variants",
    variants: [],
  };
  let failures = 0;
  let lastError: unknown;
  let notBefore = Number.NEGATIVE_INFINITY;
  let lastPollAt = Number.NEGATIVE_INFINITY;
  let latePolls = 0;

  while (!options.signal?.aborted) {
    let wait = POLL_INTERVAL_MS;
    lastPollAt = dependencies.now();
    try {
      const polled = await dependencies.call<TextGeneration>(
        "get_text_generation",
        { brand_id: target.brandId, text_generation_id: target.textGenerationId },
        { signal: options.signal },
      );
      generation = polled;
      failures = 0;
      lastError = undefined;
      options.onProgress?.(polled);
      if (polled.status === "failed") await forgetGeneration(dependencies, target.textGenerationId);
      if (polled.status === "succeeded") await markFinished(dependencies, target.textGenerationId);
      if (isFinished(polled)) break;
    } catch (error) {
      if (options.signal?.aborted || !isTransient(error)) throw error;
      failures += 1;
      lastError = error;
      const asked = retryAfterMs(error);
      if (asked !== undefined) notBefore = dependencies.now() + asked;
      wait = Math.min(asked ?? POLL_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS);
    }
    const remaining = deadline - dependencies.now();
    if (notBefore > deadline && wait >= remaining) break;
    if (remaining <= 0) {
      if (lastPollAt >= deadline) latePolls += 1;
      const pollAgain = lastPollAt < deadline || (unreachable(lastError) && latePolls < LATE_POLLS);
      if (!pollAgain) break;
      if (lastPollAt >= deadline) await dependencies.sleep(LATE_POLL_WAIT_MS, options.signal);
      continue;
    }
    await dependencies.sleep(Math.min(wait, remaining), options.signal);
  }
  if (unreachable(lastError) && !isFinished(generation)) return { ...generation, unreachable: true };
  return generation;
}

function unreachable(error: unknown): boolean {
  return error instanceof McpNetworkError && !error.timedOut;
}

export function failureTitle(checking: boolean): string {
  return checking ? "Could not check the post" : "Could not write the post";
}

export function validateToolInput(input: ToolInput): string | undefined {
  if (input.textGenerationId || input.brief?.trim()) return undefined;
  return MISSING_BRIEF;
}

export async function writeForTool(dependencies: WriteDependencies, input: ToolInput): Promise<ToolResult> {
  const invalid = validateToolInput(input);
  if (invalid) throw new Error(invalid);

  let target: WriteTarget;
  if (input.textGenerationId) {
    const account = await signedInAccount(dependencies);
    const known = (await readEntries(dependencies)).find(
      (entry) => entry.account === account && entry.textGenerationId === input.textGenerationId,
    );
    target = {
      brandId: input.brandId,
      textGenerationId: input.textGenerationId,
      platform: known?.platform ?? input.platform,
    };
  } else {
    const request = requestOf(input);
    const same = await findSameWrite(dependencies, input);
    if (same?.textGenerationId) {
      target = { brandId: same.brandId, textGenerationId: same.textGenerationId, platform: same.platform };
      const earlier = await pollWrite(dependencies, target);
      if (earlier.status === "failed") return { status: "previous_write_failed", note: FAILED_WRITE_NOTE };
      return answerFor(target, earlier);
    } else {
      try {
        target = targetFrom(await startWrite(dependencies, request));
      } catch (error) {
        if (error instanceof ConnectionRenewedError) throw new ConnectionRenewedError(CONNECTION_RENEWED_TOOL);
        if (!mayStillBeRunning(error)) throw error;
        return {
          status: "may_still_be_writing",
          brandId: request.brandId,
          platform: request.platform,
          note: UNKNOWN_OUTCOME_NOTE,
        };
      }
    }
  }

  return answerFor(target, await pollWrite(dependencies, target));
}

function answerFor(target: WriteTarget, generation: PolledWrite): ToolResult {
  const variants = writtenVariants(generation);
  if (!isFinished(generation)) {
    return {
      status: "still_writing",
      brandId: target.brandId,
      textGenerationId: target.textGenerationId,
      platform: generation.platform,
      variants,
      note: generation.unreachable ? UNREACHABLE_TOOL_NOTE : STILL_WRITING_NOTE,
    };
  }
  if (generation.status === "failed") {
    return {
      status: "failed",
      brandId: target.brandId,
      platform: generation.platform ?? target.platform,
      variants,
      note: FAILED_WRITE_NOTE,
    };
  }
  return { status: generation.status, platform: generation.platform, variants };
}

async function generate(
  dependencies: WriteDependencies,
  pending: WriteRecord,
  signal: AbortSignal | undefined,
  fresh: boolean,
): Promise<{ text_generation_id: string }> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await dependencies.call<{ text_generation_id: string }>(
        "generate_text",
        { idempotency_key: pending.key, brand_id: pending.brandId, brief: pending.brief, platform: pending.platform },
        { signal, timeoutMs: GENERATE_TIMEOUT_MS, resendAfterSignIn: fresh && attempt === 0 },
      );
    } catch (error) {
      const inProgress = error instanceof McpToolError && error.kind === "idempotency_in_progress";
      if (!inProgress || attempt >= IN_PROGRESS_RETRIES || signal?.aborted) throw error;
      await dependencies.sleep(IN_PROGRESS_WAIT_MS, signal);
    }
  }
}

async function settledKey(dependencies: WriteDependencies, slot: string, key: string): Promise<string> {
  for (let check = 0; check < SETTLE_CHECKS; check += 1) {
    await dependencies.sleep(SETTLE_MIN_MS + dependencies.random() * SETTLE_SPREAD_MS);
    const current = parse(await dependencies.storage.getItem(slot));
    if (current && current.key !== key && !current.textGenerationId) return current.key;
  }
  return key;
}

async function markFinished(dependencies: WriteDependencies, textGenerationId: string): Promise<void> {
  const items = await dependencies.storage.allItems();
  const now = dependencies.now();
  for (const [slot, value] of Object.entries(items)) {
    if (!slot.startsWith(PENDING_WRITE_PREFIX)) continue;
    const entry = live(parse(value), now);
    if (entry?.textGenerationId === textGenerationId && !entry.finished) {
      await dependencies.storage.setItem(slot, JSON.stringify({ ...entry, finished: true }));
      await prune(dependencies, slot);
    }
  }
}

async function forgetGeneration(dependencies: WriteDependencies, textGenerationId: string): Promise<void> {
  const items = await dependencies.storage.allItems();
  for (const [slot, value] of Object.entries(items)) {
    if (!slot.startsWith(PENDING_WRITE_PREFIX)) continue;
    const entry = parse(value);
    if (entry?.textGenerationId === textGenerationId) await clearEntry(dependencies, slot, entry.key);
  }
}

function requestOf(input: ToolInput): WriteRequest {
  return { brandId: input.brandId, brief: (input.brief ?? "").trim(), platform: input.platform ?? "x" };
}

async function signedInAccount(dependencies: WriteDependencies): Promise<string> {
  await dependencies.signIn();
  return dependencies.account();
}

function slotFor(account: string, request: WriteRequest): string {
  const digest = createHash("sha256")
    .update([account, request.brandId, request.platform, request.brief.trim()].join("\n"))
    .digest("hex");
  return `${PENDING_WRITE_PREFIX}${digest.slice(0, 32)}`;
}

function live(entry: WriteRecord | undefined, now: number): WriteRecord | undefined {
  return entry && now - entry.startedAt < PENDING_WRITE_TTL_MS ? entry : undefined;
}

function parse(value: string | undefined): WriteRecord | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as WriteRecord;
  } catch {
    return undefined;
  }
}

async function readEntry(dependencies: WriteDependencies, slot: string): Promise<WriteRecord | undefined> {
  return live(parse(await dependencies.storage.getItem(slot)), dependencies.now());
}

async function readEntries(dependencies: WriteDependencies): Promise<WriteRecord[]> {
  const items = await dependencies.storage.allItems();
  return Object.entries(items)
    .filter(([key]) => key.startsWith(PENDING_WRITE_PREFIX))
    .map(([, value]) => live(parse(value), dependencies.now()))
    .filter((entry): entry is WriteRecord => entry !== undefined);
}

async function saveEntry(dependencies: WriteDependencies, slot: string, entry: WriteRecord): Promise<void> {
  await dependencies.storage.setItem(slot, JSON.stringify(entry));
  await prune(dependencies, slot);
}

async function clearEntry(dependencies: WriteDependencies, slot: string, key: string): Promise<void> {
  const current = parse(await dependencies.storage.getItem(slot));
  if (current?.key === key) await dependencies.storage.removeItem(slot);
}

async function prune(dependencies: WriteDependencies, keep: string): Promise<void> {
  const now = dependencies.now();
  const stored = Object.entries(await dependencies.storage.allItems())
    .filter(([key]) => key.startsWith(PENDING_WRITE_PREFIX))
    .map(([key, value]) => ({ key, entry: parse(value) }));
  const expired = stored.filter(({ key, entry }) => key !== keep && !live(entry, now));
  const settled = stored.filter((item) => !expired.includes(item) && live(item.entry, now)?.finished);
  const surplus = settled
    .filter(({ key }) => key !== keep)
    .sort((a, b) => (a.entry?.startedAt ?? 0) - (b.entry?.startedAt ?? 0))
    .slice(0, Math.max(0, settled.length - MAX_PENDING_WRITES));
  for (const { key } of [...expired, ...surplus]) await dependencies.storage.removeItem(key);
}
