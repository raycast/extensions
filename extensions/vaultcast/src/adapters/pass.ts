import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { homedir } from "os";
import { join, relative, sep } from "path";

import { getCliPathOverride } from "../registry";
import type { AdapterStatus, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { resolveBinary, runCli } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const NOT_INSTALLED_REASON = "pass not found. Install it with: brew install pass";
const USERNAME_KEYS = new Set(["username", "user", "login"]);
const EMAIL_KEYS = new Set(["email", "e-mail", "mail"]);
const URL_KEYS = new Set(["url", "website", "site"]);

export interface PassEntry {
  password?: string;
  username?: string;
  email?: string;
  url?: string;
  hasTotp: boolean;
}

/** pass convention: password on the first line, then optional `key: value` lines and an otpauth:// URI (pass-otp). */
export function parsePassEntry(content: string): PassEntry {
  const [first = "", ...rest] = content.split(/\r?\n/);
  const entry: PassEntry = { password: first || undefined, hasTotp: false };

  for (const line of rest) {
    if (line.trim().startsWith("otpauth://")) {
      entry.hasTotp = true;
      continue;
    }
    const match = /^\s*([^:]+?)\s*:\s*(.+?)\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const key = match[1].toLowerCase();
    const value = match[2];
    if (USERNAME_KEYS.has(key)) {
      entry.username ??= value;
    } else if (EMAIL_KEYS.has(key)) {
      entry.email ??= value;
    } else if (URL_KEYS.has(key)) {
      entry.url ??= value;
    }
  }

  return entry;
}

function getStoreDir(): string {
  return process.env.PASSWORD_STORE_DIR || join(homedir(), ".password-store");
}

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(passAdapter.cliBinary, getCliPathOverride(passAdapter.id));
}

async function runPass(args: string[]): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error(NOT_INSTALLED_REASON);
  }
  return runCli(binary, args);
}

/** Decrypts one entry; gpg-agent asks for the key passphrase via pinentry when it has none cached. */
async function showEntry(item: VaultItem): Promise<PassEntry> {
  return parsePassEntry(await runPass(["show", item.id]));
}

async function listEntryNames(dir: string): Promise<string[]> {
  const names: string[] = [];
  for (const dirent of await readdir(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith(".")) {
      continue; // .git, .gpg-id, .extensions
    }
    const path = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      names.push(...(await listEntryNames(path)));
    } else if (dirent.name.endsWith(".gpg")) {
      names.push(path);
    }
  }
  return names;
}

/** Lists entry names from the store's file tree, so browsing never needs to decrypt anything. */
async function loadAllItems(): Promise<VaultItem[]> {
  const storeDir = getStoreDir();
  const files = await listEntryNames(storeDir);

  return sortVaultItems(
    files.map((file) => {
      const id = relative(storeDir, file).slice(0, -".gpg".length).split(sep).join("/");
      const slash = id.lastIndexOf("/");
      return {
        id,
        title: id.slice(slash + 1),
        subtitle: slash === -1 ? undefined : id.slice(0, slash),
        managerId: passAdapter.id,
      };
    }),
  );
}

export const passAdapter: PasswordManagerAdapter = {
  id: "pass",
  name: "pass",
  cliBinary: "pass",

  async isAvailable(): Promise<AdapterStatus> {
    if (!(await getBinary())) {
      return { ok: false, reason: NOT_INSTALLED_REASON };
    }
    if (!existsSync(join(getStoreDir(), ".gpg-id"))) {
      return { ok: false, reason: `No password store at ${getStoreDir()}. Run: pass init <gpg-id>` };
    }
    return { ok: true };
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const { password } = await showEntry(item);
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return (await showEntry(item)).username;
  },

  async getEmail(item: VaultItem): Promise<string | undefined> {
    return (await showEntry(item)).email;
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    // Needs the pass-otp extension.
    try {
      return (await runPass(["otp", item.id])).trim() || undefined;
    } catch {
      return undefined;
    }
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return (await showEntry(item)).url;
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    const entry = await showEntry(item);
    return {
      hasUrl: Boolean(entry.url),
      url: entry.url,
      hasEmail: Boolean(entry.email),
      hasUsername: Boolean(entry.username),
      hasTotp: entry.hasTotp,
      hasPassword: Boolean(entry.password),
    };
  },
};
