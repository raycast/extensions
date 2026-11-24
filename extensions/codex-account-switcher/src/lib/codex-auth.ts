import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const CODEX_AUTH_INSTALL_COMMAND = "npm install --global @loongphy/codex-auth@0.3.0";
export const CODEX_AUTH_INSTALL_URL = "https://github.com/Loongphy/codex-auth#install";

export type RefreshMode = "api" | "local";

export type UsageWindow = {
  used_percent: number;
  window_minutes: number;
  resets_at: number;
};

export type UsageRefresh = {
  requested: boolean;
  method: "api" | "local" | null;
  status: "not_requested" | "ok" | "no_data" | "http_error" | "missing_auth" | "error";
  http_status: number | null;
  error_code: string | null;
};

export type UsageSnapshot = {
  source: "api" | "local" | "cache" | "none";
  updated_at: number | null;
  primary: UsageWindow | null;
  secondary: UsageWindow | null;
  credits: {
    has_credits: boolean;
    unlimited: boolean;
    balance: string | null;
  } | null;
  reset_credits: number | null;
  refresh: UsageRefresh;
};

export type CodexAccount = {
  number: number;
  account_key: string;
  email: string;
  alias: string | null;
  account_name: string | null;
  plan: string | null;
  auth_mode: string;
  active: boolean;
  created_at: number;
  last_used_at: number | null;
  usage: UsageSnapshot;
};

export type AccountList = {
  schema_version: 1;
  command: "list";
  active_account_key: string | null;
  accounts: CodexAccount[];
};

type CodexAuthErrorDocument = {
  schema_version: number;
  error: {
    code: string;
    message: string;
  };
};

type RegistryUsage = {
  primary: UsageWindow | null;
  secondary: UsageWindow | null;
  credits: UsageSnapshot["credits"];
  reset_credits?: number | null;
  plan_type?: string | null;
};

type RegistryAccount = Omit<CodexAccount, "number" | "active" | "usage"> & {
  last_usage: RegistryUsage | null;
  last_usage_at: number | null;
};

type RegistryDocument = {
  schema_version: number;
  active_account_key: string | null;
  accounts: RegistryAccount[];
};

export class CodexAuthError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CodexAuthError";
  }
}

function expandedPath(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutable(configuredPath?: string): Promise<string> {
  const configured = configuredPath?.trim();
  if (configured) {
    const resolved = expandedPath(configured);
    if (await isExecutable(resolved)) return resolved;
    throw new CodexAuthError(`Executable not found: ${resolved}`, "executable_not_found");
  }

  const candidates = [
    "/opt/homebrew/bin/codex-auth",
    "/usr/local/bin/codex-auth",
    path.join(os.homedir(), ".local", "bin", "codex-auth"),
    path.join(os.homedir(), ".npm-global", "bin", "codex-auth"),
  ];

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  throw new CodexAuthError(
    "codex-auth was not found. Install version 0.3.0 or newer, or set its path in the extension preferences.",
    "executable_not_found",
  );
}

function runtimePath(): string {
  const extra = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    path.join(os.homedir(), ".local", "bin"),
  ];
  return [...extra, process.env.PATH ?? ""].filter(Boolean).join(path.delimiter);
}

function parseDocument<T>(stdout: string): T {
  const value = stdout.trim();
  if (!value) throw new CodexAuthError("codex-auth returned no data.", "empty_output");

  let parsed: T | CodexAuthErrorDocument;
  try {
    parsed = JSON.parse(value) as T | CodexAuthErrorDocument;
  } catch {
    throw new CodexAuthError(
      "Unable to read codex-auth output. Make sure version 0.3.0 or newer is installed.",
      "invalid_json",
    );
  }

  if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
    throw new CodexAuthError(parsed.error.message, parsed.error.code);
  }
  return parsed;
}

async function runJson<T>(args: string[]): Promise<T> {
  const preferences = getPreferenceValues<Preferences>();
  const executable = await resolveExecutable(preferences.codexAuthPath);

  try {
    const { stdout } = await execFileAsync(executable, args, {
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      encoding: "utf8",
      env: { ...process.env, PATH: runtimePath() },
    });
    return parseDocument<T>(stdout);
  } catch (error) {
    if (error instanceof CodexAuthError) throw error;

    const processError = error as Error & { stdout?: string; stderr?: string; killed?: boolean };
    if (processError.stdout?.trim()) return parseDocument<T>(processError.stdout);
    if (processError.killed) throw new CodexAuthError("The codex-auth request timed out.", "timeout");

    const detail = processError.stderr?.trim() || processError.message;
    if (detail.includes("unknown flag") && detail.includes("--json")) {
      throw new CodexAuthError(
        "The installed codex-auth version does not support the JSON interface required by Raycast. Upgrade to version 0.3.0 or newer.",
        "unsupported_version",
      );
    }
    throw new CodexAuthError(detail || "codex-auth failed.", "process_error");
  }
}

async function runPlain(args: string[], timeout = 30_000): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const executable = await resolveExecutable(preferences.codexAuthPath);

  try {
    await execFileAsync(executable, args, {
      timeout,
      maxBuffer: 2 * 1024 * 1024,
      encoding: "utf8",
      env: { ...process.env, PATH: runtimePath() },
    });
  } catch (error) {
    const processError = error as Error & { stderr?: string; killed?: boolean };
    if (processError.killed) throw new CodexAuthError("The codex-auth request timed out.", "timeout");
    throw new CodexAuthError(processError.stderr?.trim() || processError.message, "process_error");
  }
}

async function readRegistry(): Promise<AccountList> {
  const codexHome = process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex");
  const registryPath = path.join(codexHome, "accounts", "registry.json");

  let registry: RegistryDocument;
  try {
    registry = JSON.parse(await readFile(registryPath, "utf8")) as RegistryDocument;
  } catch {
    throw new CodexAuthError(`Unable to read ${registryPath}`, "registry_error");
  }

  if (!Array.isArray(registry.accounts)) {
    throw new CodexAuthError("Unsupported codex-auth account registry format.", "unsupported_registry");
  }

  const orderedAccounts = [...registry.accounts].sort((left, right) => {
    if (left.email !== right.email) return left.email < right.email ? -1 : 1;

    const leftActive = left.account_key === registry.active_account_key;
    const rightActive = right.account_key === registry.active_account_key;
    if (leftActive !== rightActive) return leftActive ? -1 : 1;

    const leftRank = planSortRank(left.last_usage?.plan_type || left.plan);
    const rightRank = planSortRank(right.last_usage?.plan_type || right.plan);
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftPlan = displayPlanForSort(left);
    const rightPlan = displayPlanForSort(right);
    if (leftPlan !== rightPlan) return leftPlan < rightPlan ? -1 : 1;
    return left.account_key < right.account_key ? -1 : left.account_key > right.account_key ? 1 : 0;
  });

  return {
    schema_version: 1,
    command: "list",
    active_account_key: registry.active_account_key,
    accounts: orderedAccounts.map((account, index) => {
      const snapshot = account.last_usage;
      return {
        number: index + 1,
        account_key: account.account_key,
        email: account.email,
        alias: account.alias,
        account_name: account.account_name,
        active: account.account_key === registry.active_account_key,
        plan: snapshot?.plan_type || account.plan,
        auth_mode: account.auth_mode,
        created_at: account.created_at,
        last_used_at: account.last_used_at,
        usage: {
          source: snapshot ? "cache" : "none",
          updated_at: account.last_usage_at,
          primary: snapshot?.primary ?? null,
          secondary: snapshot?.secondary ?? null,
          credits: snapshot?.credits ?? null,
          reset_credits: snapshot?.reset_credits ?? null,
          refresh: {
            requested: false,
            method: null,
            status: "not_requested",
            http_status: null,
            error_code: null,
          },
        },
      };
    }),
  };
}

function planSortRank(plan: string | null | undefined): number {
  if (["team", "business", "enterprise", "edu", "education"].includes(plan?.toLowerCase() ?? "")) return 0;
  if (["free", "plus", "prolite", "pro"].includes(plan?.toLowerCase() ?? "")) return 1;
  return 2;
}

function displayPlanForSort(account: RegistryAccount): string {
  if (account.auth_mode === "apikey") return "API_KEY";
  return (account.last_usage?.plan_type || account.plan || "-").toUpperCase();
}

function refreshFlag(mode: RefreshMode): "--api" | "--skip-api" {
  return mode === "api" ? "--api" : "--skip-api";
}

export async function listAccounts(mode: RefreshMode, activeOnly = false): Promise<AccountList> {
  const args = ["list", refreshFlag(mode)];
  if (activeOnly) args.push("--active");
  args.push("--json");

  let result: AccountList;
  try {
    result = await runJson<AccountList>(args);
  } catch (error) {
    if (!(error instanceof CodexAuthError) || error.code !== "unsupported_version") throw error;

    const compatibleArgs = ["list", refreshFlag(mode)];
    if (activeOnly) compatibleArgs.push("--active");
    await runPlain(compatibleArgs);
    result = await readRegistry();
  }
  if (result.schema_version !== 1 || result.command !== "list" || !Array.isArray(result.accounts)) {
    throw new CodexAuthError("Unsupported codex-auth JSON format.", "unsupported_schema");
  }
  return result;
}

export async function switchAccount(accountKey: string): Promise<CodexAccount> {
  let result: {
    schema_version: 1;
    command: "switch";
    switched_to: CodexAccount;
  };
  try {
    result = await runJson<{
      schema_version: 1;
      command: "switch";
      switched_to: CodexAccount;
    }>(["switch", accountKey, "--json"]);
  } catch (error) {
    if (!(error instanceof CodexAuthError) || error.code !== "unsupported_version") throw error;

    const before = await readRegistry();
    const target = before.accounts.find((account) => account.account_key === accountKey);
    if (!target) throw new CodexAuthError("The account to switch to was not found.", "account_not_found");
    await runPlain(["switch", String(target.number)]);
    const registry = await readRegistry();
    const switchedTo = registry.accounts.find((account) => account.account_key === accountKey && account.active);
    if (!switchedTo) throw new CodexAuthError("codex-auth did not confirm the account switch.", "state_uncertain");
    result = { schema_version: 1, command: "switch", switched_to: switchedTo };
  }

  if (result.schema_version !== 1 || result.command !== "switch" || !result.switched_to) {
    throw new CodexAuthError("Unsupported codex-auth JSON format.", "unsupported_schema");
  }
  return result.switched_to;
}

export async function loginAccount(deviceAuth = false): Promise<void> {
  const args = ["login"];
  if (deviceAuth) args.push("--device-auth");
  await runPlain(args, 5 * 60_000);
}

export async function removeAccount(accountKey: string): Promise<void> {
  try {
    await runJson<{
      schema_version: 1;
      command: "remove";
      removed: CodexAccount[];
      new_active_account_key: string | null;
    }>(["remove", accountKey, "--json"]);
  } catch (error) {
    if (!(error instanceof CodexAuthError) || error.code !== "unsupported_version") throw error;
    await runPlain(["remove", accountKey]);
  }

  let registry: AccountList;
  try {
    registry = await readRegistry();
  } catch {
    throw new CodexAuthError(
      "Unable to verify local state after removal. Refresh the account list before trying again.",
      "state_uncertain",
    );
  }

  if (registry.accounts.some((account) => account.account_key === accountKey)) {
    throw new CodexAuthError(
      "codex-auth did not confirm the removal. Refresh the account list before trying again.",
      "state_uncertain",
    );
  }
}
