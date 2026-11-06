import { getCliPathOverride } from "../registry";
import type { AdapterStatus, AuthRequirements, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, parseJson, resolveBinary } from "../utils/cli";
import { filterVaultItems } from "../utils/items";
import {
  getPassCliInfo,
  isLockCodePromptError,
  isPassCliSessionLocked,
  isValidProtonPassPin,
  isWrongPinError,
  passCliSessionHasLock,
  runPassCliCommand,
  unlockPassCliSession,
} from "./protonpass-session";

const ITEM_ID_SEPARATOR = "::";

interface VaultEntry {
  name: string;
  vault_id: string;
  share_id: string;
}

interface VaultListJson {
  vaults: VaultEntry[];
}

interface ItemSummary {
  id: string;
  share_id?: string;
  title?: string;
  item_type?: string;
  state?: string;
  content?: {
    title?: string;
    content?: {
      Login?: {
        username?: string;
        email?: string;
        urls?: string[];
        url?: string;
        totp?: unknown;
      };
    };
  };
}

interface ItemListJson {
  items: ItemSummary[];
}

interface LoginFields {
  username?: string;
  email?: string;
  url?: string;
  hasTotp?: boolean;
}

interface ParsedItemId {
  shareId: string;
  itemId: string;
}

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(protonPassAdapter.cliBinary, getCliPathOverride(protonPassAdapter.id));
}

async function runPassCli(args: string[]): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error("pass-cli not found");
  }
  return runPassCliCommand(binary, args);
}

function encodeItemId(shareId: string, itemId: string): string {
  return `${shareId}${ITEM_ID_SEPARATOR}${itemId}`;
}

function parseItemId(id: string): ParsedItemId {
  const separatorIndex = id.indexOf(ITEM_ID_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error(`Invalid item ID: ${id}`);
  }

  const shareId = id.slice(0, separatorIndex);
  const itemId = id.slice(separatorIndex + ITEM_ID_SEPARATOR.length);

  if (!shareId || !itemId) {
    throw new Error(`Invalid item ID: ${id}`);
  }

  return { shareId, itemId };
}

function toSecretUri(shareId: string, itemId: string, field: string): string {
  return `pass://${shareId}/${itemId}/${field}`;
}

async function viewField(shareId: string, itemId: string, field: string): Promise<string | undefined> {
  const value = await runPassCli(["item", "view", toSecretUri(shareId, itemId, field)]);
  return value || undefined;
}

async function viewFieldSafe(shareId: string, itemId: string, field: string): Promise<string | undefined> {
  try {
    return await viewField(shareId, itemId, field);
  } catch {
    return undefined;
  }
}

async function listVaults(): Promise<VaultEntry[]> {
  const stdout = await runPassCli(["vault", "list", "--output", "json"]);
  const data = parseJson<VaultListJson>(stdout);
  return data.vaults ?? [];
}

async function listItemsInVault(shareId: string): Promise<ItemSummary[]> {
  const baseArgs = ["item", "list", "--share-id", shareId, "--filter-type", "login", "--output", "json"];

  try {
    const stdout = await runPassCli([...baseArgs, "--show-secrets"]);
    const data = parseJson<ItemListJson>(stdout);
    return data.items ?? [];
  } catch {
    try {
      const stdout = await runPassCli(baseArgs);
      const data = parseJson<ItemListJson>(stdout);
      return data.items ?? [];
    } catch {
      return [];
    }
  }
}

function isLoginItem(item: ItemSummary): boolean {
  if (item.item_type?.toLowerCase() === "login") {
    return true;
  }

  return Boolean(item.content?.content?.Login);
}

function isActiveItem(item: ItemSummary): boolean {
  if (!item.state) {
    return true;
  }

  return item.state.toLowerCase() === "active";
}

function extractLoginFields(item: ItemSummary): LoginFields {
  const login = item.content?.content?.Login;
  if (!login) {
    return {};
  }

  const url = login.urls?.find((entry) => entry.trim())?.trim() || login.url?.trim() || undefined;
  const hasTotp = extractTotpHint(login);

  return {
    username: login.username?.trim() || undefined,
    email: login.email?.trim() || undefined,
    url,
    hasTotp,
  };
}

function extractTotpHint(
  login: NonNullable<NonNullable<ItemSummary["content"]>["content"]>["Login"],
): boolean | undefined {
  if (!login || !("totp" in login)) {
    return undefined;
  }

  const totp = login.totp;
  if (totp === null || totp === undefined || totp === "") {
    return false;
  }

  return true;
}

function resolveItemTitle(item: ItemSummary): string {
  return item.content?.title?.trim() || item.title?.trim() || "Untitled";
}

async function loadAllItems(): Promise<VaultItem[]> {
  const vaults = await listVaults();
  const vaultNames = new Map(vaults.map((vault) => [vault.share_id, vault.name]));

  const itemLists = await Promise.all(vaults.map((vault) => listItemsInVault(vault.share_id)));

  const results: VaultItem[] = [];

  for (let i = 0; i < vaults.length; i++) {
    const vault = vaults[i];
    const items = itemLists[i];

    for (const item of items) {
      if (!isLoginItem(item) || !isActiveItem(item)) {
        continue;
      }

      const shareId = item.share_id ?? vault.share_id;
      const vaultName = vaultNames.get(shareId) ?? vault.name;
      const title = resolveItemTitle(item);
      const login = extractLoginFields(item);

      results.push({
        id: encodeItemId(shareId, item.id),
        title,
        subtitle: vaultName,
        username: login.username,
        email: login.email,
        url: login.url,
        ...(login.hasTotp !== undefined ? { hasTotp: login.hasTotp } : {}),
        managerId: protonPassAdapter.id,
      });
    }
  }

  return results.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

const PROTON_PASS_PIN_REQUIREMENTS: AuthRequirements = {
  fields: [{ id: "pin", label: "PIN", type: "pin" }],
};

async function checkProtonPassAvailability(): Promise<AdapterStatus> {
  const binary = await getBinary();
  if (!binary) {
    return { ok: false, reason: "pass-cli not found. Install from https://protonpass.github.io/pass-cli/" };
  }

  let info;
  try {
    info = await getPassCliInfo(binary);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Not logged in. Run pass-cli login to authenticate.",
    };
  }

  if (passCliSessionHasLock(info) && (await isPassCliSessionLocked(binary))) {
    return {
      ok: false,
      reason: "Session gesperrt. Bitte 6-stellige PIN eingeben.",
      needsAuth: true,
    };
  }

  return { ok: true };
}

export const protonPassAdapter: PasswordManagerAdapter = {
  id: "protonpass",
  name: "Proton Pass",
  cliBinary: "pass-cli",

  async isAvailable(): Promise<AdapterStatus> {
    return checkProtonPassAvailability();
  },

  async getAuthRequirements(): Promise<AuthRequirements> {
    const binary = await getBinary();
    if (!binary) {
      return { fields: [] };
    }

    try {
      const info = await getPassCliInfo(binary);
      if (!passCliSessionHasLock(info)) {
        return { fields: [] };
      }
    } catch {
      return { fields: [] };
    }

    return PROTON_PASS_PIN_REQUIREMENTS;
  },

  async authenticate(credentials: Record<string, string>): Promise<AdapterStatus> {
    const binary = await getBinary();
    if (!binary) {
      return { ok: false, reason: "pass-cli not found. Install from https://protonpass.github.io/pass-cli/" };
    }

    try {
      const info = await getPassCliInfo(binary);
      if (!passCliSessionHasLock(info)) {
        return { ok: true };
      }
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Not logged in. Run pass-cli login to authenticate.",
      };
    }

    const pin = credentials.pin ?? "";
    if (!isValidProtonPassPin(pin)) {
      return { ok: false, reason: "PIN muss 6 Ziffern haben.", needsAuth: true };
    }

    try {
      await unlockPassCliSession(binary, pin);
    } catch (error) {
      if (!(await isPassCliSessionLocked(binary))) {
        return { ok: true };
      }

      const message = error instanceof CliError ? error.message : String(error);
      if (message === "PIN falsch." || isWrongPinError(message)) {
        return { ok: false, reason: "PIN falsch.", needsAuth: true };
      }

      if (isLockCodePromptError(message)) {
        return {
          ok: false,
          reason: "PIN-Eingabe nicht möglich. Entsperre die Session im Terminal mit: pass-cli session unlock",
          needsAuth: true,
        };
      }

      return { ok: false, reason: message, needsAuth: true };
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
    const { shareId, itemId } = parseItemId(item.id);
    const password = await viewField(shareId, itemId, "password");
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    if (item.username) {
      return item.username;
    }

    const { shareId, itemId } = parseItemId(item.id);
    return viewField(shareId, itemId, "username");
  },

  async getEmail(item: VaultItem): Promise<string | undefined> {
    if (item.email) {
      return item.email;
    }

    const { shareId, itemId } = parseItemId(item.id);
    return viewField(shareId, itemId, "email");
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    const { shareId, itemId } = parseItemId(item.id);
    return viewFieldSafe(shareId, itemId, "totp");
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    if (item.url) {
      return item.url;
    }

    const { shareId, itemId } = parseItemId(item.id);
    return viewFieldSafe(shareId, itemId, "url");
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    const { shareId, itemId } = parseItemId(item.id);
    const [url, email, username, totp, password] = await Promise.all([
      protonPassAdapter.getUrl?.(item) ?? viewFieldSafe(shareId, itemId, "url"),
      protonPassAdapter.getEmail(item).catch(() => undefined),
      protonPassAdapter.getUsername(item).catch(() => undefined),
      viewFieldSafe(shareId, itemId, "totp"),
      viewFieldSafe(shareId, itemId, "password"),
    ]);

    return {
      hasUrl: Boolean(url),
      url,
      hasEmail: Boolean(email),
      hasUsername: Boolean(username),
      hasTotp: Boolean(totp),
      hasPassword: Boolean(password),
    };
  },
};
