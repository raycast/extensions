import { getCliPathOverride } from "../registry";
import type { AdapterStatus, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, parseJson, resolveBinary, runCli } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const NOT_INSTALLED_REASON = "Keeper Commander (keeper) not found. Install it with: brew install keeper-commander";
const LOGIN_FAILED_REASON =
  "Keeper login failed. Set up persistent login once in Terminal: keeper shell → login → this-device register → this-device persistent-login on";
const LOGIN_RECORD_TYPES = new Set(["login", "general"]);

interface KeeperListRecord {
  record_uid: string;
  type?: string;
  title?: string;
}

interface KeeperField {
  type?: string;
  value?: unknown[];
}

/** `keeper get --format json`: typed records carry `fields`, legacy ("general") records flat properties. */
interface KeeperRecord {
  title?: string;
  fields?: KeeperField[];
  custom?: KeeperField[];
  login?: string;
  password?: string;
  login_url?: string;
  totp?: string;
}

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(keeperAdapter.cliBinary, getCliPathOverride(keeperAdapter.id));
}

/**
 * Every keeper invocation logs in (persistent login) and syncs the vault, so each call takes seconds. A failed
 * auto-login exits 0 with empty stdout; prompts cancel because stdin is no TTY.
 */
async function runKeeper(args: string[]): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error(NOT_INSTALLED_REASON);
  }
  let stdout;
  try {
    stdout = await runCli(binary, args, { timeoutMs: 90_000 });
  } catch (error) {
    // No exit code: keeper exited 0 with only stderr output, its way of reporting a failed auto-login.
    if (error instanceof CliError && error.exitCode === undefined) {
      throw new Error(`${error.message}. ${LOGIN_FAILED_REASON}`);
    }
    throw error;
  }
  if (!stdout.trim()) {
    throw new Error(LOGIN_FAILED_REASON);
  }
  return stdout;
}

function fieldValue(record: KeeperRecord, type: string): string | undefined {
  const field = [...(record.fields ?? []), ...(record.custom ?? [])].find((entry) => entry.type === type);
  const value = field?.value?.[0];
  return typeof value === "string" && value ? value : undefined;
}

export function readKeeperRecord(record: KeeperRecord) {
  return {
    username: fieldValue(record, "login") ?? (record.login || undefined),
    email: fieldValue(record, "email"),
    password: fieldValue(record, "password") ?? (record.password || undefined),
    url: fieldValue(record, "url") ?? (record.login_url || undefined),
    hasTotp: Boolean(fieldValue(record, "oneTimeCode") ?? record.totp),
  };
}

async function getRecord(item: VaultItem): Promise<ReturnType<typeof readKeeperRecord>> {
  return readKeeperRecord(parseJson<KeeperRecord>(await runKeeper(["get", item.id, "--format", "json"])));
}

async function loadAllItems(): Promise<VaultItem[]> {
  const stdout = await runKeeper(["list", "--format", "json"]);
  // An empty vault prints a message object instead of an array.
  if (!stdout.trimStart().startsWith("[")) {
    return [];
  }
  return sortVaultItems(
    parseJson<KeeperListRecord[]>(stdout)
      .filter((record) => LOGIN_RECORD_TYPES.has(record.type ?? "general"))
      .map((record) => ({
        id: record.record_uid,
        title: record.title?.trim() || "Untitled",
        managerId: keeperAdapter.id,
      })),
  );
}

export const keeperAdapter: PasswordManagerAdapter = {
  id: "keeper",
  name: "Keeper",
  cliBinary: "keeper",

  async isAvailable(): Promise<AdapterStatus> {
    // A real check would cost a full login + sync; login problems surface when the list loads.
    return (await getBinary()) ? { ok: true } : { ok: false, reason: NOT_INSTALLED_REASON };
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    // Same call as for the other fields: an empty stdout must keep meaning "login failed".
    const { password } = await getRecord(item);
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return (await getRecord(item)).username;
  },

  async getEmail(item: VaultItem): Promise<string | undefined> {
    return (await getRecord(item)).email;
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    try {
      // Without --format json, `keeper totp` opens a live display that waits for Enter.
      const rows = parseJson<Array<{ key?: string; value?: string }>>(
        await runKeeper(["totp", item.id, "--format", "json"]),
      );
      const code =
        rows.find((row) => row.key === "Current")?.value ??
        rows.find((row) => /^\d{6,8}$/.test(row.value ?? ""))?.value;
      return code?.trim() || undefined;
    } catch {
      return undefined;
    }
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return (await getRecord(item)).url;
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    const record = await getRecord(item);
    return {
      hasUrl: Boolean(record.url),
      url: record.url,
      hasEmail: Boolean(record.email),
      hasUsername: Boolean(record.username),
      hasTotp: record.hasTotp,
      hasPassword: Boolean(record.password),
    };
  },
};
