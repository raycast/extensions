import { getCliPathOverride } from "../registry";
import type { AdapterStatus, AuthRequirements, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, parseJson, resolveBinary, runCli, SessionLockedError } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const LOGIN_ITEM_TYPE = 1;
const NOT_FOUND_PATTERN = /^not found\.?$/i;
const LOCKED_PATTERN = /vault is locked/i;
const NOT_LOGGED_IN_PATTERN = /you are not logged in/i;
const WRONG_PASSWORD_PATTERN = /invalid master password|decryption operation failed/i;
const NOT_INSTALLED_REASON = "Bitwarden CLI (bw) not found. Install it with: brew install bitwarden-cli";
const NOT_LOGGED_IN_REASON = "Not logged in. Run in Terminal: bw login";

interface BwStatus {
  status?: "unauthenticated" | "locked" | "unlocked";
}

interface BwItem {
  id: string;
  type: number;
  name?: string;
  deletedDate?: string | null;
  login?: {
    username?: string | null;
    password?: string | null;
    totp?: string | null;
    uris?: Array<{ uri?: string | null }>;
  };
}

/** Session key from `bw unlock`; lives only in this process's memory. */
let sessionKey: string | undefined;
/**
 * bw rewrites its data.json on every run, reads included; parallel runs could clobber each other, so they are
 * serialized. Each run costs ~2.5 s of CLI startup, so the adapter keeps the number of calls low.
 */
let queue: Promise<unknown> = Promise.resolve();

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(bitwardenAdapter.cliBinary, getCliPathOverride(bitwardenAdapter.id));
}

function runBw(args: string[], env: Record<string, string> = {}): Promise<string> {
  const run = queue.then(async () => {
    const binary = await getBinary();
    if (!binary) {
      throw new Error(NOT_INSTALLED_REASON);
    }
    // Without --nointeraction, bw prompts for the master password on a locked vault and exits 0.
    const sessionEnv: Record<string, string> = sessionKey ? { BW_SESSION: sessionKey } : {};
    try {
      return await runCli(binary, [...args, "--nointeraction"], { env: { ...sessionEnv, ...env } });
    } catch (error) {
      if (error instanceof CliError && LOCKED_PATTERN.test(error.message)) {
        throw new SessionLockedError(error.message);
      }
      throw error;
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Reads one field via `bw get`; undefined when the item has no such field. */
async function getField(field: "username" | "uri" | "totp", id: string): Promise<string | undefined> {
  try {
    return (await runBw(["get", field, id])) || undefined;
  } catch (error) {
    if (error instanceof CliError && NOT_FOUND_PATTERN.test(error.message.trim())) {
      return undefined;
    }
    throw error;
  }
}

async function getStatus(): Promise<BwStatus["status"]> {
  return parseJson<BwStatus>(await runBw(["status"])).status;
}

function firstUri(item: BwItem): string | undefined {
  return item.login?.uris?.map((entry) => entry.uri?.trim()).find(Boolean) || undefined;
}

async function loadAllItems(): Promise<VaultItem[]> {
  // Folder names would need a second `bw list folders` run; not worth another 2.5 s per load.
  const items = parseJson<BwItem[]>(await runBw(["list", "items"]));

  return sortVaultItems(
    items
      .filter((item) => item.type === LOGIN_ITEM_TYPE && !item.deletedDate)
      .map((item) => ({
        id: item.id,
        title: item.name?.trim() || "Untitled",
        username: item.login?.username?.trim() || undefined,
        url: firstUri(item),
        hasTotp: Boolean(item.login?.totp),
        managerId: bitwardenAdapter.id,
      })),
  );
}

const MASTER_PASSWORD_REQUIREMENTS: AuthRequirements = {
  fields: [{ id: "password", label: "Master Password", type: "password" }],
};

export const bitwardenAdapter: PasswordManagerAdapter = {
  id: "bitwarden",
  name: "Bitwarden",
  cliBinary: "bw",

  async isAvailable(): Promise<AdapterStatus> {
    let status;
    try {
      status = await getStatus();
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }

    if (status === "unlocked") {
      return { ok: true };
    }
    if (status === "locked") {
      return { ok: false, reason: "Vault locked. Enter your master password.", needsAuth: true };
    }
    return { ok: false, reason: NOT_LOGGED_IN_REASON };
  },

  getAuthRequirements(): AuthRequirements {
    return MASTER_PASSWORD_REQUIREMENTS;
  },

  async authenticate(credentials: Record<string, string>): Promise<AdapterStatus> {
    const password = credentials.password ?? "";
    if (!password) {
      return { ok: false, reason: "Enter your master password.", needsAuth: true };
    }

    try {
      const key = (await runBw(["unlock", "--passwordenv", "BW_PASSWORD", "--raw"], { BW_PASSWORD: password })).trim();
      if (!key) {
        return { ok: false, reason: "bw unlock returned no session key.", needsAuth: true };
      }
      sessionKey = key;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (NOT_LOGGED_IN_PATTERN.test(message)) {
        return { ok: false, reason: NOT_LOGGED_IN_REASON };
      }
      const reason = WRONG_PASSWORD_PATTERN.test(message) ? "Wrong master password." : message;
      return { ok: false, reason, needsAuth: true };
    }

    // bw only reads its local cache; pull changes made elsewhere. Offline still works from the cache.
    await runBw(["sync"]).catch(() => undefined);
    return { ok: true };
  },

  async lockSession(): Promise<void> {
    if (!sessionKey) {
      return;
    }
    try {
      await runBw(["lock"]);
    } finally {
      sessionKey = undefined;
    }
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const password = await runBw(["get", "password", item.id]);
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return item.username ?? getField("username", item.id);
  },

  async getEmail(): Promise<string | undefined> {
    // Bitwarden logins have no separate email field; emails live in the username.
    return undefined;
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    return (await getField("totp", item.id))?.trim();
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return item.url ?? getField("uri", item.id);
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    const full = parseJson<BwItem>(await runBw(["get", "item", item.id]));
    const url = firstUri(full);
    return {
      hasUrl: Boolean(url),
      url,
      hasEmail: false,
      hasUsername: Boolean(full.login?.username),
      hasTotp: Boolean(full.login?.totp),
      hasPassword: Boolean(full.login?.password),
    };
  },
};
