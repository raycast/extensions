import { getCliPathOverride } from "../registry";
import type { AdapterStatus, AuthRequirements, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, parseJson, resolveBinary, runCli, SessionLockedError } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const NOT_INSTALLED_REASON = "Dashlane CLI (dcli) not found. Install it with: brew install dashlane/tap/dashlane-cli";
const NOT_LOGGED_IN_REASON = "Not logged in. Register this device once in Terminal: dcli sync";
const PROMPT_FAILED_PATTERN = /master password|user force closed|prompt/i;

interface DcliCredential {
  id: string;
  title?: string;
  login?: string;
  email?: string;
  url?: string;
  otpSecret?: string;
  otpUrl?: string;
}

/**
 * Master password from the unlock form; lives only in this process's memory. Only needed when dcli has no
 * password saved in the keychain (`dcli status` → Locked: Yes).
 */
let masterPassword: string | undefined;

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(dashlaneAdapter.cliBinary, getCliPathOverride(dashlaneAdapter.id));
}

async function runDcli(args: string[], password = masterPassword): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error(NOT_INSTALLED_REASON);
  }
  const env: Record<string, string> = password ? { DASHLANE_MASTER_PASSWORD: password } : {};
  try {
    // Data commands may sync first (at most hourly), so allow for the network.
    return await runCli(binary, args, { env, timeoutMs: 60_000 });
  } catch (error) {
    // Without a saved or provided master password, dcli prompts; stdin is closed, so the prompt fails.
    if (error instanceof CliError && !password && PROMPT_FAILED_PATTERN.test(error.message)) {
      throw new SessionLockedError(error.message);
    }
    throw error;
  }
}

export function parseDcliStatus(stdout: string): { loggedIn: boolean; locked: boolean } {
  const value = (key: string) => new RegExp(`^${key}:\\s*(\\w+)`, "im").exec(stdout)?.[1]?.toLowerCase();
  return { loggedIn: value("Logged in") === "yes", locked: value("Locked") !== "no" };
}

/** `dcli read` only treats uppercase UUIDs without braces as IDs; anything else is a title lookup. */
function secretPath(item: VaultItem, field: string): string {
  return `dl://${item.id.replace(/[{}]/g, "").toUpperCase()}/${field}`;
}

async function readField(item: VaultItem, field: string): Promise<string | undefined> {
  const value = (await runDcli(["read", secretPath(item, field)])).replace(/\r?\n$/, "");
  return value || undefined;
}

/** dcli can log warnings to stdout before the JSON. */
function parseJsonArray<T>(stdout: string): T[] {
  const start = stdout.indexOf("[");
  return start === -1 ? [] : parseJson<T[]>(stdout.slice(start));
}

async function loadAllItems(): Promise<VaultItem[]> {
  // dcli has no secrets-free listing; passwords and OTP secrets are dropped right here.
  const credentials = parseJsonArray<DcliCredential>(await runDcli(["password", "--output", "json"]));
  return sortVaultItems(
    credentials.map((credential) => ({
      id: credential.id,
      title: credential.title?.trim() || credential.url?.trim() || "Untitled",
      username: credential.login?.trim() || undefined,
      email: credential.email?.trim() || undefined,
      url: credential.url?.trim() || undefined,
      hasTotp: Boolean(credential.otpSecret || credential.otpUrl),
      managerId: dashlaneAdapter.id,
    })),
  );
}

const MASTER_PASSWORD_REQUIREMENTS: AuthRequirements = {
  fields: [{ id: "password", label: "Master Password", type: "password" }],
};

export const dashlaneAdapter: PasswordManagerAdapter = {
  id: "dashlane",
  name: "Dashlane",
  cliBinary: "dcli",

  async isAvailable(): Promise<AdapterStatus> {
    let status;
    try {
      // `dcli status` exists since April 2026. Prints "Logged in: Yes|No" and "Locked: Yes|No"; never prompts.
      status = parseDcliStatus(await runDcli(["status"]));
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
    if (!status.loggedIn) {
      return { ok: false, reason: NOT_LOGGED_IN_REASON };
    }
    if (status.locked && !masterPassword) {
      return { ok: false, reason: "Vault locked. Enter your master password.", needsAuth: true };
    }
    return { ok: true };
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
      // sync decrypts the local vault, so it fails on a wrong master password.
      await runDcli(["sync"], password);
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error), needsAuth: true };
    }
    masterPassword = password;
    return { ok: true };
  },

  async lockSession(): Promise<void> {
    // Forget only our copy. `dcli lock` would also delete the password the user saved in the keychain.
    masterPassword = undefined;
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const password = await readField(item, "password");
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return item.username ?? readField(item, "login");
  },

  async getEmail(item: VaultItem): Promise<string | undefined> {
    return item.email ?? readField(item, "email");
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    if (item.hasTotp === false) {
      return undefined;
    }
    try {
      return (await readField(item, "otpSecret?otp"))?.trim();
    } catch {
      return undefined;
    }
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return item.url ?? readField(item, "url");
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    return {
      hasUrl: Boolean(item.url),
      url: item.url,
      hasEmail: Boolean(item.email),
      hasUsername: Boolean(item.username),
      hasTotp: item.hasTotp === true,
      hasPassword: true,
    };
  },
};
