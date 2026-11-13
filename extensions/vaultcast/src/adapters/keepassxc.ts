import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";

import { getCliPathOverride } from "../registry";
import type { AdapterStatus, AuthRequirements, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, resolveBinary, runCli, SessionLockedError } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

// Installs from the DMG / MSI do not put the CLI on PATH.
const BUNDLED_BINARIES = [
  "/Applications/KeePassXC.app/Contents/MacOS/keepassxc-cli",
  "C:\\Program Files\\KeePassXC\\keepassxc-cli.exe",
];

/** Database password from the unlock form; lives only in this process's memory. keepassxc-cli has no session. */
let databasePassword: string | undefined;

async function getBinary(): Promise<string | undefined> {
  const override = getCliPathOverride(keepassxcAdapter.id);
  const found = await resolveBinary(keepassxcAdapter.cliBinary, override);
  return found ?? (override ? undefined : BUNDLED_BINARIES.find((path) => existsSync(path)));
}

function getDatabasePath(): string | undefined {
  const path = getPreferenceValues<Preferences>().keepassxcDatabase?.trim();
  return path ? path.replace(/^~(?=$|[/\\])/, homedir()) : undefined;
}

/** keepassxc-cli syntax: `<command> [options] <database> [entry]`. */
async function runKeepassxc(
  command: string,
  options: string[],
  entry: string | undefined,
  password: string,
): Promise<string> {
  const binary = await getBinary();
  const database = getDatabasePath();
  if (!binary || !database) {
    throw new Error("KeePassXC is not set up. Check the KeePassXC Database preference.");
  }
  // -q suppresses the password prompt; the password is read from stdin.
  return runCli(binary, [command, "-q", ...options, database, ...(entry === undefined ? [] : [entry])], {
    input: `${password}\n`,
  });
}

async function runUnlocked(command: string, options: string[], entry?: string): Promise<string> {
  if (databasePassword === undefined) {
    throw new SessionLockedError("KeePassXC database is locked.");
  }
  return runKeepassxc(command, options, entry, databasePassword);
}

/** `show -a` prints each attribute followed by a newline. */
async function showAttribute(path: string, attribute: string): Promise<string | undefined> {
  const stdout = await runUnlocked("show", ["-s", "-a", attribute], path);
  return stdout.replace(/\r?\n$/, "") || undefined;
}

export interface KeepassxcEntry {
  path: string;
  title: string;
  group?: string;
  username?: string;
  url?: string;
  hasTotp: boolean;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[entity] ?? match;
  });
}

const XML_TAG = /<(\/?)(Group|Entry|History|String|Key|Value|Name|UUID|RecycleBinUUID)\b[^>]*?(\/?)>/g;
const TEXT_TAGS = new Set(["Key", "Value", "Name", "UUID", "RecycleBinUUID"]);

/**
 * Reads entries from `keepassxc-cli export -f xml` (KeePass 2 XML). The CSV export would be simpler, but it
 * includes the recycle bin under a localized group name; the XML marks it by UUID and nests old versions in <History>.
 */
export function parseKeepassXml(xml: string): KeepassxcEntry[] {
  const groups: Array<{ name?: string; uuid?: string }> = [];
  const entries: KeepassxcEntry[] = [];
  let recycleBinUuid: string | undefined;
  let historyDepth = 0;
  let entry: { uuid?: string; strings: Map<string, string> } | undefined;
  let stringKey: string | undefined;
  let inString = false;
  let textStart = -1;

  for (const match of xml.matchAll(XML_TAG)) {
    const [tag, closing, name, selfClosing] = match;
    const index = match.index ?? 0;

    if (!closing) {
      if (selfClosing) {
        continue;
      }
      if (TEXT_TAGS.has(name)) {
        textStart = index + tag.length;
      } else if (name === "Group") {
        groups.push({});
      } else if (name === "History") {
        historyDepth++;
      } else if (name === "Entry" && historyDepth === 0) {
        entry = { strings: new Map() };
      } else if (name === "String") {
        inString = true;
        stringKey = undefined;
      }
      continue;
    }

    const text = TEXT_TAGS.has(name) && textStart >= 0 ? decodeXml(xml.slice(textStart, index)) : "";
    textStart = -1;
    const group = groups[groups.length - 1];

    if (name === "RecycleBinUUID") {
      recycleBinUuid = text || undefined;
    } else if (name === "UUID" && historyDepth === 0) {
      if (entry) {
        entry.uuid ??= text;
      } else if (group && !group.uuid) {
        group.uuid = text;
      }
    } else if (name === "Name" && !entry && group && group.name === undefined) {
      group.name = text;
    } else if (name === "Key" && inString) {
      stringKey = text;
    } else if (name === "Value" && inString && entry && historyDepth === 0 && stringKey) {
      entry.strings.set(stringKey, text);
    } else if (name === "String") {
      inString = false;
    } else if (name === "History") {
      historyDepth--;
    } else if (name === "Group") {
      groups.pop();
    } else if (name === "Entry" && historyDepth === 0 && entry) {
      const inRecycleBin = Boolean(recycleBinUuid) && groups.some((ancestor) => ancestor.uuid === recycleBinUuid);
      const title = entry.strings.get("Title")?.trim() ?? "";
      if (!inRecycleBin && title) {
        // keepassxc-cli addresses entries by path below the root group, e.g. "Banking/Bank".
        const groupPath = groups.slice(1).map((ancestor) => ancestor.name ?? "");
        entries.push({
          path: [...groupPath, title].join("/"),
          title,
          group: groupPath.join("/") || undefined,
          username: entry.strings.get("UserName")?.trim() || undefined,
          url: entry.strings.get("URL")?.trim() || undefined,
          hasTotp: Boolean(entry.strings.get("otp") || entry.strings.get("TOTP Seed")),
        });
      }
      entry = undefined;
    }
  }

  return entries;
}

async function loadAllItems(): Promise<VaultItem[]> {
  const entries = parseKeepassXml(await runUnlocked("export", ["-f", "xml"]));
  return sortVaultItems(
    entries.map((entry) => ({
      id: entry.path,
      title: entry.title,
      subtitle: entry.group,
      username: entry.username,
      url: entry.url,
      hasTotp: entry.hasTotp,
      managerId: keepassxcAdapter.id,
    })),
  );
}

const PASSWORD_REQUIREMENTS: AuthRequirements = {
  fields: [{ id: "password", label: "Database Password", type: "password" }],
};

export const keepassxcAdapter: PasswordManagerAdapter = {
  id: "keepassxc",
  name: "KeePassXC",
  cliBinary: "keepassxc-cli",

  async isAvailable(): Promise<AdapterStatus> {
    if (!(await getBinary())) {
      return { ok: false, reason: "keepassxc-cli not found. Install KeePassXC from https://keepassxc.org" };
    }
    const database = getDatabasePath();
    if (!database) {
      return { ok: false, reason: "Set the KeePassXC Database in the extension preferences." };
    }
    if (!existsSync(database)) {
      return { ok: false, reason: `KeePassXC database not found: ${database}` };
    }
    if (databasePassword === undefined) {
      return { ok: false, reason: "Database locked. Enter the database password.", needsAuth: true };
    }
    return { ok: true };
  },

  getAuthRequirements(): AuthRequirements {
    return PASSWORD_REQUIREMENTS;
  },

  async authenticate(credentials: Record<string, string>): Promise<AdapterStatus> {
    const password = credentials.password ?? "";
    try {
      // `ls` on the root group is the cheapest command that has to decrypt the database.
      await runKeepassxc("ls", [], undefined, password);
    } catch (error) {
      // With -q, keepassxc-cli exits 1 without a message on a wrong password.
      const stderr = error instanceof CliError ? error.stderr?.trim() : undefined;
      return { ok: false, reason: stderr || "Wrong password, or the database could not be opened.", needsAuth: true };
    }
    databasePassword = password;
    return { ok: true };
  },

  async lockSession(): Promise<void> {
    databasePassword = undefined;
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const password = await showAttribute(item.id, "Password");
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return item.username ?? showAttribute(item.id, "UserName");
  },

  async getEmail(): Promise<string | undefined> {
    // KeePass entries have no email field.
    return undefined;
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    try {
      return (await runUnlocked("show", ["-t"], item.id)).trim() || undefined;
    } catch (error) {
      if (error instanceof SessionLockedError) {
        throw error;
      }
      return undefined;
    }
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return item.url ?? showAttribute(item.id, "URL");
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    // Everything but the password is known from the export; each CLI call re-derives the database key (~1 s).
    return {
      hasUrl: Boolean(item.url),
      url: item.url,
      hasEmail: false,
      hasUsername: Boolean(item.username),
      hasTotp: item.hasTotp === true,
      hasPassword: true,
    };
  },
};
