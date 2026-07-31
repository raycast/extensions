import { LocalStorage } from "@raycast/api";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ChatProvider } from "./types";

export const usageCacheTtlMilliseconds = 5 * 60 * 1_000;

export interface UsageWindow {
  id: string;
  title: string;
  usedPercent: number;
  remainingPercent: number;
  resetsAt?: number;
  durationMinutes?: number;
}

export interface UsageCredits {
  hasCredits?: boolean;
  unlimited?: boolean;
  balance?: string;
  monthlyLimit?: number;
  usedCredits?: number;
  utilization?: number;
  currency?: string;
  spendingLimit?: string;
  spent?: string;
  remainingPercent?: number;
  resetsAt?: number;
}

interface UsageTokenBucket {
  date: string;
  tokens: number;
}

export interface UsageTokenStats {
  lifetimeTokens?: number;
  peakDailyTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  longestRunningTurnSeconds?: number;
  currentStreakDays?: number;
  longestStreakDays?: number;
  dailyBuckets?: UsageTokenBucket[];
}

export interface ProviderUsageData {
  provider: ChatProvider;
  fetchedAt: number;
  plan?: string;
  windows: UsageWindow[];
  credits?: UsageCredits;
  tokens?: UsageTokenStats;
}

type UsageDataSource = "live" | "cache" | "stale" | "unavailable";

export interface ProviderUsageState {
  provider: ChatProvider;
  data?: ProviderUsageData;
  error?: string;
  lastAttemptAt?: number;
  source: UsageDataSource;
}

export interface UsageSnapshot {
  generatedAt: number;
  providers: Record<ChatProvider, ProviderUsageState>;
}

interface StoredProviderUsageState {
  data?: ProviderUsageData;
  error?: string;
  lastAttemptAt?: number;
}

interface StoredUsageCache {
  version: 1;
  providers: Record<ChatProvider, StoredProviderUsageState>;
}

interface RpcPendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const cacheKey = "cli-usage-cache-v1";
const providers: ChatProvider[] = ["claude", "codex"];
const codexTimeoutMilliseconds = 15_000;
const claudeTimeoutMilliseconds = 20_000;
const maximumJsonBufferLength = 4 * 1_024 * 1_024;
let inFlightUsageRequest: Promise<UsageSnapshot> | undefined;

export async function loadUsageSnapshot(options?: { force?: boolean }): Promise<UsageSnapshot> {
  if (inFlightUsageRequest) return inFlightUsageRequest;
  inFlightUsageRequest = loadUsageSnapshotInternal(Boolean(options?.force)).finally(() => {
    inFlightUsageRequest = undefined;
  });
  return inFlightUsageRequest;
}

export function providerRemainingPercent(data: ProviderUsageData | undefined): number | undefined {
  const values = data?.windows.map((window) => window.remainingPercent).filter(Number.isFinite) || [];
  return values.length > 0 ? Math.min(...values) : undefined;
}

async function loadUsageSnapshotInternal(force: boolean): Promise<UsageSnapshot> {
  const now = Date.now();
  const cache = await readUsageCache();
  const nextCache: StoredUsageCache = {
    version: 1,
    providers: {
      claude: { ...cache.providers.claude },
      codex: { ...cache.providers.codex },
    },
  };
  const attempted = new Set<ChatProvider>();
  const succeeded = new Set<ChatProvider>();

  await Promise.all(
    providers.map(async (provider) => {
      const previous = nextCache.providers[provider];
      const freshnessAnchor = previous.lastAttemptAt || previous.data?.fetchedAt || 0;
      if (!force && now - freshnessAnchor < usageCacheTtlMilliseconds) return;

      attempted.add(provider);
      try {
        const data = provider === "codex" ? await fetchCodexUsage() : await fetchClaudeUsage();
        nextCache.providers[provider] = { data, lastAttemptAt: Date.now() };
        succeeded.add(provider);
      } catch (error) {
        nextCache.providers[provider] = {
          ...previous,
          error: safeErrorMessage(error, provider),
          lastAttemptAt: Date.now(),
        };
      }
    }),
  );

  if (attempted.size > 0) await writeUsageCache(nextCache);

  return {
    generatedAt: Date.now(),
    providers: {
      claude: runtimeProviderState("claude", nextCache.providers.claude, attempted, succeeded),
      codex: runtimeProviderState("codex", nextCache.providers.codex, attempted, succeeded),
    },
  };
}

function runtimeProviderState(
  provider: ChatProvider,
  stored: StoredProviderUsageState,
  attempted: Set<ChatProvider>,
  succeeded: Set<ChatProvider>,
): ProviderUsageState {
  let source: UsageDataSource;
  if (succeeded.has(provider)) source = "live";
  else if (stored.data && stored.error) source = "stale";
  else if (stored.data) source = "cache";
  else source = "unavailable";

  return {
    provider,
    data: stored.data,
    error: attempted.has(provider) || stored.error ? stored.error : undefined,
    lastAttemptAt: stored.lastAttemptAt,
    source,
  };
}

async function readUsageCache(): Promise<StoredUsageCache> {
  const emptyCache = (): StoredUsageCache => ({
    version: 1,
    providers: { claude: {}, codex: {} },
  });

  try {
    const stored = await LocalStorage.getItem<string>(cacheKey);
    if (!stored) return emptyCache();
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.providers)) return emptyCache();
    return {
      version: 1,
      providers: {
        claude: parseStoredProviderState(parsed.providers.claude, "claude"),
        codex: parseStoredProviderState(parsed.providers.codex, "codex"),
      },
    };
  } catch {
    return emptyCache();
  }
}

async function writeUsageCache(cache: StoredUsageCache): Promise<void> {
  try {
    await LocalStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    return;
  }
}

function parseStoredProviderState(value: unknown, provider: ChatProvider): StoredProviderUsageState {
  if (!isRecord(value)) return {};
  return {
    data: parseStoredProviderData(value.data, provider),
    error: typeof value.error === "string" ? sanitizeText(value.error) : undefined,
    lastAttemptAt: finiteNumber(value.lastAttemptAt),
  };
}

function parseStoredProviderData(value: unknown, provider: ChatProvider): ProviderUsageData | undefined {
  if (!isRecord(value) || value.provider !== provider) return undefined;
  const fetchedAt = finiteNumber(value.fetchedAt);
  if (!fetchedAt || !Array.isArray(value.windows)) return undefined;

  return {
    provider,
    fetchedAt,
    plan: typeof value.plan === "string" ? value.plan : undefined,
    windows: value.windows.flatMap((window) => {
      const parsed = parseStoredWindow(window);
      return parsed ? [parsed] : [];
    }),
    credits: parseStoredCredits(value.credits),
    tokens: parseStoredTokenStats(value.tokens),
  };
}

function parseStoredWindow(value: unknown): UsageWindow | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return undefined;
  const usedPercent = finiteNumber(value.usedPercent);
  const remainingPercent = finiteNumber(value.remainingPercent);
  if (usedPercent === undefined || remainingPercent === undefined) return undefined;
  return {
    id: value.id,
    title: value.title,
    usedPercent,
    remainingPercent,
    resetsAt: finiteNumber(value.resetsAt),
    durationMinutes: finiteNumber(value.durationMinutes),
  };
}

function parseStoredCredits(value: unknown): UsageCredits | undefined {
  if (!isRecord(value)) return undefined;
  return compactObject({
    hasCredits: booleanValue(value.hasCredits),
    unlimited: booleanValue(value.unlimited),
    balance: stringValue(value.balance),
    monthlyLimit: finiteNumber(value.monthlyLimit),
    usedCredits: finiteNumber(value.usedCredits),
    utilization: finiteNumber(value.utilization),
    currency: stringValue(value.currency),
    spendingLimit: stringValue(value.spendingLimit),
    spent: stringValue(value.spent),
    remainingPercent: finiteNumber(value.remainingPercent),
    resetsAt: finiteNumber(value.resetsAt),
  });
}

function parseStoredTokenStats(value: unknown): UsageTokenStats | undefined {
  if (!isRecord(value)) return undefined;
  const dailyBuckets = Array.isArray(value.dailyBuckets)
    ? value.dailyBuckets.flatMap((bucket) => {
        if (!isRecord(bucket) || typeof bucket.date !== "string") return [];
        const tokens = finiteNumber(bucket.tokens);
        return tokens === undefined ? [] : [{ date: bucket.date, tokens }];
      })
    : undefined;
  return compactObject({
    lifetimeTokens: finiteNumber(value.lifetimeTokens),
    peakDailyTokens: finiteNumber(value.peakDailyTokens),
    inputTokens: finiteNumber(value.inputTokens),
    outputTokens: finiteNumber(value.outputTokens),
    cacheReadTokens: finiteNumber(value.cacheReadTokens),
    cacheCreationTokens: finiteNumber(value.cacheCreationTokens),
    longestRunningTurnSeconds: finiteNumber(value.longestRunningTurnSeconds),
    currentStreakDays: finiteNumber(value.currentStreakDays),
    longestStreakDays: finiteNumber(value.longestStreakDays),
    dailyBuckets,
  });
}

async function fetchCodexUsage(): Promise<ProviderUsageData> {
  const executable = resolveCliExecutable("codex");
  const child = spawn(executable, ["app-server", "--stdio"], {
    cwd: homedir(),
    env: childEnvironment(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.resume();
  const rpc = createCodexRpcClient(child);

  try {
    return await withTimeout(
      (async () => {
        await rpc.request("initialize", {
          clientInfo: {
            name: "raycast-cli-claude-codex",
            title: "PromptCast",
            version: "1.0.0",
          },
          capabilities: {
            experimentalApi: true,
            requestAttestation: false,
          },
        });
        rpc.notify("initialized");
        const [account, rateLimits, tokenUsage] = await Promise.all([
          rpc.request("account/read", { refreshToken: false }),
          rpc.request("account/rateLimits/read"),
          rpc.request("account/usage/read"),
        ]);
        return normalizeCodexUsage(account, rateLimits, tokenUsage, Date.now());
      })(),
      codexTimeoutMilliseconds,
      "Codex took too long to respond",
    );
  } finally {
    rpc.close();
    closeChildProcess(child);
  }
}

function createCodexRpcClient(child: ChildProcessWithoutNullStreams) {
  let nextId = 1;
  let stdoutBuffer = "";
  let closed = false;
  const pending = new Map<string, RpcPendingRequest>();

  const rejectPending = (message: string) => {
    if (closed) return;
    closed = true;
    const error = new Error(message);
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdoutBuffer += chunk;
    if (stdoutBuffer.length > maximumJsonBufferLength) {
      rejectPending("Codex returned a response that was too large");
      return;
    }
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let message: unknown;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isRecord(message) || (typeof message.id !== "number" && typeof message.id !== "string")) continue;
      const request = pending.get(String(message.id));
      if (!request) continue;
      pending.delete(String(message.id));
      if (isRecord(message.error)) {
        request.reject(new Error(sanitizeText(stringValue(message.error.message) || "Codex rejected the request")));
      } else {
        request.resolve(message.result);
      }
    }
  });
  child.once("error", () => rejectPending("Could not start Codex CLI"));
  child.once("exit", (exitCode) => {
    if (pending.size > 0) rejectPending(`Codex exited before responding${exitCode ? ` (${exitCode})` : ""}`);
  });

  const send = (payload: Record<string, unknown>) => {
    if (closed || child.stdin.destroyed) throw new Error("The Codex connection is closed");
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  };

  return {
    request(method: string, params?: unknown): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(String(id), { resolve, reject });
        try {
          send(params === undefined ? { method, id } : { method, id, params });
        } catch (error) {
          pending.delete(String(id));
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
    notify(method: string, params?: unknown): void {
      send(params === undefined ? { method } : { method, params });
    },
    close(): void {
      rejectPending("The Codex usage request was closed");
    },
  };
}

function normalizeCodexUsage(
  accountValue: unknown,
  rateLimitsValue: unknown,
  tokenUsageValue: unknown,
  fetchedAt: number,
): ProviderUsageData {
  const account = isRecord(accountValue) && isRecord(accountValue.account) ? accountValue.account : undefined;
  const rateLimits = isRecord(rateLimitsValue) ? rateLimitsValue : {};
  const snapshots = codexRateLimitSnapshots(rateLimits);
  const windows: UsageWindow[] = [];
  const seenWindows = new Set<string>();

  for (const [snapshotIndex, snapshot] of snapshots.entries()) {
    const limitId = stringValue(snapshot.limitId) || `codex-${snapshotIndex + 1}`;
    const limitName = stringValue(snapshot.limitName);
    for (const windowKind of ["primary", "secondary"] as const) {
      const window = isRecord(snapshot[windowKind]) ? snapshot[windowKind] : undefined;
      if (!window) continue;
      const usedPercent = finiteNumber(window.usedPercent);
      if (usedPercent === undefined) continue;
      const durationMinutes = finiteNumber(window.windowDurationMins);
      const resetsAt = epochMilliseconds(window.resetsAt);
      const signature = `${limitId}:${windowKind}:${durationMinutes || ""}:${resetsAt || ""}`;
      if (seenWindows.has(signature)) continue;
      seenWindows.add(signature);
      const durationTitle = durationWindowTitle(durationMinutes, windowKind);
      windows.push({
        id: signature,
        title: limitName && snapshots.length > 1 ? `${limitName} · ${durationTitle}` : durationTitle,
        usedPercent: clampPercent(usedPercent),
        remainingPercent: clampPercent(100 - usedPercent),
        resetsAt,
        durationMinutes,
      });
    }
  }

  const firstSnapshot = snapshots[0];
  const creditsValue = snapshots.map((snapshot) => snapshot.credits).find(isRecord);
  const individualLimit = snapshots.map((snapshot) => snapshot.individualLimit).find(isRecord);
  const credits = compactObject<UsageCredits>({
    hasCredits: creditsValue ? booleanValue(creditsValue.hasCredits) : undefined,
    unlimited: creditsValue ? booleanValue(creditsValue.unlimited) : undefined,
    balance: creditsValue ? stringValue(creditsValue.balance) : undefined,
    spendingLimit: individualLimit ? stringValue(individualLimit.limit) : undefined,
    spent: individualLimit ? stringValue(individualLimit.used) : undefined,
    remainingPercent: individualLimit ? finiteNumber(individualLimit.remainingPercent) : undefined,
    resetsAt: individualLimit ? epochMilliseconds(individualLimit.resetsAt) : undefined,
  });
  const accountPlan = account ? stringValue(account.planType) : undefined;
  const rateLimitPlan = firstSnapshot ? stringValue(firstSnapshot.planType) : undefined;

  return {
    provider: "codex",
    fetchedAt,
    plan: accountPlan || rateLimitPlan,
    windows,
    credits,
    tokens: normalizeCodexTokenUsage(tokenUsageValue),
  };
}

function codexRateLimitSnapshots(rateLimits: Record<string, unknown>): Record<string, unknown>[] {
  if (isRecord(rateLimits.rateLimitsByLimitId)) {
    const snapshots = Object.values(rateLimits.rateLimitsByLimitId).filter(isRecord);
    if (snapshots.length > 0) return snapshots;
  }
  return isRecord(rateLimits.rateLimits) ? [rateLimits.rateLimits] : [];
}

function normalizeCodexTokenUsage(value: unknown): UsageTokenStats | undefined {
  if (!isRecord(value)) return undefined;
  const summary = isRecord(value.summary) ? value.summary : {};
  const dailyBuckets = Array.isArray(value.dailyUsageBuckets)
    ? value.dailyUsageBuckets
        .flatMap((bucket) => {
          if (!isRecord(bucket) || typeof bucket.startDate !== "string") return [];
          const tokens = finiteNumber(bucket.tokens);
          return tokens === undefined ? [] : [{ date: bucket.startDate, tokens }];
        })
        .slice(-90)
    : undefined;
  return compactObject({
    lifetimeTokens: finiteNumber(summary.lifetimeTokens),
    peakDailyTokens: finiteNumber(summary.peakDailyTokens),
    longestRunningTurnSeconds: finiteNumber(summary.longestRunningTurnSec),
    currentStreakDays: finiteNumber(summary.currentStreakDays),
    longestStreakDays: finiteNumber(summary.longestStreakDays),
    dailyBuckets,
  });
}

async function fetchClaudeUsage(): Promise<ProviderUsageData> {
  const executable = resolveCliExecutable("claude");
  const child = spawn(
    executable,
    [
      "--print",
      "--verbose",
      "--safe-mode",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--no-session-persistence",
    ],
    {
      cwd: homedir(),
      env: childEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  child.stderr.resume();

  try {
    const payload = await withTimeout(
      waitForClaudeUsageResponse(child, "raycast-usage"),
      claudeTimeoutMilliseconds,
      "Claude took too long to respond",
    );
    return normalizeClaudeUsage(payload, Date.now());
  } finally {
    closeChildProcess(child);
  }
}

function waitForClaudeUsageResponse(child: ChildProcessWithoutNullStreams, requestId: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let stdoutBuffer = "";
    let settled = false;
    const finish = (error: Error | undefined, value?: unknown) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      if (stdoutBuffer.length > maximumJsonBufferLength) {
        finish(new Error("Claude returned a response that was too large"));
        return;
      }
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let message: unknown;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (!isRecord(message) || message.type !== "control_response" || !isRecord(message.response)) continue;
        if (message.response.request_id !== requestId) continue;
        if (message.response.subtype === "error") {
          finish(new Error(sanitizeText(stringValue(message.response.error) || "Claude rejected the usage request")));
          return;
        }
        finish(undefined, message.response.response);
        return;
      }
    });
    child.once("error", () => finish(new Error("Could not start Claude CLI")));
    child.once("exit", (exitCode) => {
      if (!settled) finish(new Error(`Claude exited before responding${exitCode ? ` (${exitCode})` : ""}`));
    });

    child.stdin.write(
      `${JSON.stringify({
        type: "control_request",
        request_id: requestId,
        request: { subtype: "get_usage" },
      })}\n`,
    );
  });
}

function normalizeClaudeUsage(value: unknown, fetchedAt: number): ProviderUsageData {
  if (!isRecord(value)) throw new Error("Claude returned an unrecognized usage format");
  const rateLimits = isRecord(value.rate_limits) ? value.rate_limits : undefined;
  const windows: UsageWindow[] = [];
  const standardWindows: Array<[string, string, number]> = [
    ["five_hour", "5-hour limit", 300],
    ["seven_day", "Weekly limit", 10_080],
    ["seven_day_oauth_apps", `${"OAuth apps"} · ${"weekly"}`, 10_080],
    ["seven_day_opus", `Opus · ${"weekly"}`, 10_080],
    ["seven_day_sonnet", `Sonnet · ${"weekly"}`, 10_080],
  ];

  if (rateLimits) {
    for (const [key, title, durationMinutes] of standardWindows) {
      const window = isRecord(rateLimits[key]) ? rateLimits[key] : undefined;
      const utilization = window ? finiteNumber(window.utilization) : undefined;
      if (utilization === undefined) continue;
      windows.push({
        id: `claude:${key}`,
        title,
        usedPercent: clampPercent(utilization),
        remainingPercent: clampPercent(100 - utilization),
        resetsAt: dateMilliseconds(window?.resets_at),
        durationMinutes,
      });
    }

    if (Array.isArray(rateLimits.model_scoped)) {
      for (const [index, modelWindowValue] of rateLimits.model_scoped.entries()) {
        if (!isRecord(modelWindowValue)) continue;
        const utilization = finiteNumber(modelWindowValue.utilization);
        if (utilization === undefined) continue;
        const displayName = stringValue(modelWindowValue.display_name) || `${"Model"} ${index + 1}`;
        windows.push({
          id: `claude:model:${displayName}:${index}`,
          title: `${displayName} · ${"weekly"}`,
          usedPercent: clampPercent(utilization),
          remainingPercent: clampPercent(100 - utilization),
          resetsAt: dateMilliseconds(modelWindowValue.resets_at),
        });
      }
    }
  }

  const extraUsage = rateLimits && isRecord(rateLimits.extra_usage) ? rateLimits.extra_usage : undefined;
  const credits = extraUsage
    ? compactObject<UsageCredits>({
        monthlyLimit: finiteNumber(extraUsage.monthly_limit),
        usedCredits: finiteNumber(extraUsage.used_credits),
        utilization: finiteNumber(extraUsage.utilization),
        currency: stringValue(extraUsage.currency),
      })
    : undefined;

  return {
    provider: "claude",
    fetchedAt,
    plan: stringValue(value.subscription_type),
    windows,
    credits,
    tokens: normalizeClaudeSessionTokens(value.session),
  };
}

function normalizeClaudeSessionTokens(value: unknown): UsageTokenStats | undefined {
  if (!isRecord(value) || !isRecord(value.model_usage)) return undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let hasTokens = false;

  for (const modelUsage of Object.values(value.model_usage)) {
    if (!isRecord(modelUsage)) continue;
    const input = finiteNumber(modelUsage.inputTokens) ?? finiteNumber(modelUsage.input_tokens) ?? 0;
    const output = finiteNumber(modelUsage.outputTokens) ?? finiteNumber(modelUsage.output_tokens) ?? 0;
    const cacheRead =
      finiteNumber(modelUsage.cacheReadInputTokens) ?? finiteNumber(modelUsage.cache_read_input_tokens) ?? 0;
    const cacheCreation =
      finiteNumber(modelUsage.cacheCreationInputTokens) ?? finiteNumber(modelUsage.cache_creation_input_tokens) ?? 0;
    inputTokens += input;
    outputTokens += output;
    cacheReadTokens += cacheRead;
    cacheCreationTokens += cacheCreation;
    hasTokens ||= input > 0 || output > 0 || cacheRead > 0 || cacheCreation > 0;
  }

  if (!hasTokens) return undefined;
  return { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens };
}

function resolveCliExecutable(executable: "codex" | "claude"): string {
  const home = homedir();
  const candidates = [
    join(home, ".local", "bin", executable),
    join(home, ".npm-global", "bin", executable),
    join(home, ".bun", "bin", executable),
    join(home, "Library", "pnpm", executable),
    join(home, ".cargo", "bin", executable),
    join("/opt/homebrew/bin", executable),
    join("/usr/local/bin", executable),
  ];
  return candidates.find(existsSync) || executable;
}

function childEnvironment(): NodeJS.ProcessEnv {
  const home = homedir();
  const pathEntries = [
    join(home, ".local", "bin"),
    join(home, ".npm-global", "bin"),
    join(home, ".bun", "bin"),
    join(home, "Library", "pnpm"),
    join(home, ".cargo", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ];
  return {
    ...process.env,
    PATH: [...pathEntries, process.env.PATH || ""].filter(Boolean).join(":"),
    NO_COLOR: "1",
  };
}

function closeChildProcess(child: ChildProcessWithoutNullStreams): void {
  if (!child.stdin.destroyed) child.stdin.end();
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const killTimer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }, 500);
  killTimer.unref();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMilliseconds: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMilliseconds);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function safeErrorMessage(error: unknown, provider: ChatProvider): string {
  const fallback = `Could not retrieve ${provider === "claude" ? "Claude" : "Codex"} usage`;
  if (!(error instanceof Error)) return fallback;
  return sanitizeText(error.message) || fallback;
}

function sanitizeText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[hidden email]")
    .replace(/\b(bearer|token|secret|password|api[_ -]?key)\b\s*[:=]?\s*[^\s,;]+/gi, "$1 [hidden]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function durationWindowTitle(durationMinutes: number | undefined, kind: "primary" | "secondary"): string {
  if (durationMinutes === undefined) return kind === "primary" ? "Primary limit" : "Secondary limit";
  if (durationMinutes === 300) return "5-hour limit";
  if (durationMinutes >= 10_000 && durationMinutes <= 10_500) return "Weekly limit";
  if (durationMinutes % 1_440 === 0) return `${"Window"} · ${durationMinutes / 1_440} ${"days"}`;
  if (durationMinutes % 60 === 0) return `${"Window"} · ${durationMinutes / 60} ${"hours"}`;
  return `${"Window"} · ${durationMinutes} ${"minutes"}`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function epochMilliseconds(value: unknown): number | undefined {
  const numeric = finiteNumber(value);
  if (numeric === undefined) return undefined;
  return numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric;
}

function dateMilliseconds(value: unknown): number | undefined {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return epochMilliseconds(value);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactObject<T extends object>(value: T): T | undefined {
  return Object.values(value).some((entry) => entry !== undefined) ? value : undefined;
}
