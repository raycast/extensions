import { getCliPathOverride } from "../registry";
import type { AdapterStatus, AuthRequirements, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, resolveBinary, runCli, SessionLockedError } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const NOT_INSTALLED_REASON = "LastPass CLI (lpass) not found. Install it with: brew install lastpass-cli";
const NO_KEY_PATTERN = /could not find decryption key|lpass login/i;
const FIELD_SEPARATOR = "\x1f";
// Folders (and shared-folder headers) and secure notes appear in `lpass ls` with these pseudo URLs.
const NON_LOGIN_URLS = new Set(["http://group", "http://sn"]);
// Read the master password from stdin instead of a pinentry dialog.
const LPASS_ENV = { LPASS_DISABLE_PINENTRY: "1" };

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(lastPassAdapter.cliBinary, getCliPathOverride(lastPassAdapter.id));
}

async function runLpass(args: string[], input?: string): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error(NOT_INSTALLED_REASON);
  }
  try {
    return await runCli(binary, args, { env: LPASS_ENV, input });
  } catch (error) {
    if (error instanceof CliError && NO_KEY_PATTERN.test(error.message)) {
      throw new SessionLockedError(error.message);
    }
    throw error;
  }
}

/** `lpass show` ends each value with a newline. */
async function showField(field: "--password" | "--username" | "--url", id: string): Promise<string | undefined> {
  const value = (await runLpass(["show", field, id])).replace(/\r?\n$/, "");
  return value || undefined;
}

export function parseLpassList(stdout: string): Array<Omit<VaultItem, "managerId">> {
  return stdout
    .split("\n")
    .map((line) => line.split(FIELD_SEPARATOR))
    .filter(([id, name, , , url]) => id && name?.trim() && !NON_LOGIN_URLS.has(url ?? ""))
    .map(([id, name, group, username, url]) => ({
      id,
      title: name.trim(),
      subtitle: group?.trim() || undefined,
      username: username?.trim() || undefined,
      url: url?.trim() || undefined,
      hasTotp: false,
    }));
}

async function loadAllItems(): Promise<VaultItem[]> {
  const format = ["%ai", "%an", "%ag", "%au", "%al"].join(FIELD_SEPARATOR);
  const stdout = await runLpass(["ls", "--sync=auto", "--color=never", `--format=${format}`]);
  return sortVaultItems(parseLpassList(stdout).map((item) => ({ ...item, managerId: lastPassAdapter.id })));
}

const LOGIN_REQUIREMENTS: AuthRequirements = {
  fields: [
    { id: "email", label: "Email", type: "text" },
    { id: "password", label: "Master Password", type: "password" },
  ],
};

export const lastPassAdapter: PasswordManagerAdapter = {
  id: "lastpass",
  name: "LastPass",
  cliBinary: "lpass",

  async isAvailable(): Promise<AdapterStatus> {
    if (!(await getBinary())) {
      return { ok: false, reason: NOT_INSTALLED_REASON };
    }
    try {
      // Exit 0 when the lpass agent holds the decryption key; it forgets it after LPASS_AGENT_TIMEOUT (1 h).
      await runLpass(["status", "--quiet"]);
      return { ok: true };
    } catch {
      return { ok: false, reason: "Not logged in. Enter your LastPass email and master password.", needsAuth: true };
    }
  },

  getAuthRequirements(): AuthRequirements {
    return LOGIN_REQUIREMENTS;
  },

  async authenticate(credentials: Record<string, string>): Promise<AdapterStatus> {
    const email = credentials.email?.trim() ?? "";
    const password = credentials.password ?? "";
    if (!email || !password) {
      return { ok: false, reason: "Enter your email and master password.", needsAuth: true };
    }
    try {
      // --trust remembers this device, so later logins skip the second factor.
      await runLpass(["login", "--trust", "--color=never", email], `${password}\n`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        reason: `${message} (with two-factor login, run once in Terminal: lpass login --trust ${email})`,
        needsAuth: true,
      };
    }
  },

  async lockSession(): Promise<void> {
    await runLpass(["logout", "--force"]).catch(() => undefined);
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const password = await showField("--password", item.id);
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return item.username ?? showField("--username", item.id);
  },

  async getEmail(): Promise<string | undefined> {
    return undefined; // LastPass logins have no separate email field.
  },

  async getTotp(): Promise<string | undefined> {
    return undefined; // lpass cannot generate TOTP codes.
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return item.url ?? showField("--url", item.id);
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    return {
      hasUrl: Boolean(item.url),
      url: item.url,
      hasEmail: false,
      hasUsername: Boolean(item.username),
      hasTotp: false,
      hasPassword: true,
    };
  },
};
