import { open } from "@raycast/api";

import { getCliPathOverride } from "../registry";
import type { AdapterStatus, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { CliError, parseJson, resolveBinary, runCli } from "../utils/cli";
import { filterVaultItems, sortVaultItems } from "../utils/items";

const ITEM_ID_SEPARATOR = "::";
const NOT_INSTALLED_REASON = "1Password CLI (op) not found. Install it with: brew install --cask 1password-cli";
const NO_ACCOUNT_REASON =
  "No 1Password account found. In the 1Password app, enable Settings → Developer → Integrate with 1Password CLI.";
// op prefixes errors with e.g. "[ERROR] 2026/11/13 16:20:00 ".
const ERROR_PREFIX = /^\[ERROR\]\s+\S+\s+\S+\s+/;

interface OpAccount {
  account_uuid: string;
}

interface OpListItem {
  id: string;
  title?: string;
  vault: { id: string; name?: string };
  additional_information?: string;
  urls?: Array<{ href?: string; primary?: boolean }>;
}

interface OpItem extends OpListItem {
  fields?: Array<{ id?: string; type?: string; purpose?: string; label?: string; value?: string; totp?: string }>;
}

async function getBinary(): Promise<string | undefined> {
  return resolveBinary(onePasswordAdapter.cliBinary, getCliPathOverride(onePasswordAdapter.id));
}

/**
 * Authentication is delegated to the 1Password app (app integration): the first command of a session shows its
 * Touch ID / password prompt. So op calls can take a while, but need no credentials from the extension.
 */
async function runOp(args: string[]): Promise<string> {
  const binary = await getBinary();
  if (!binary) {
    throw new Error(NOT_INSTALLED_REASON);
  }
  try {
    return await runCli(binary, args, { timeoutMs: 60_000 });
  } catch (error) {
    if (error instanceof CliError) {
      throw new CliError(error.message.replace(ERROR_PREFIX, ""), error.exitCode, error.stderr);
    }
    throw error;
  }
}

function encodeItemId(vaultId: string, itemId: string): string {
  return `${vaultId}${ITEM_ID_SEPARATOR}${itemId}`;
}

function parseItemId(id: string): { vaultId: string; itemId: string } {
  const separator = id.indexOf(ITEM_ID_SEPARATOR);
  if (separator <= 0) {
    throw new Error(`Invalid item ID: ${id}`);
  }
  return { vaultId: id.slice(0, separator), itemId: id.slice(separator + ITEM_ID_SEPARATOR.length) };
}

function primaryUrl(item: OpListItem): string | undefined {
  const urls = item.urls ?? [];
  return (urls.find((url) => url.primary) ?? urls[0])?.href?.trim() || undefined;
}

async function getItem(item: VaultItem): Promise<OpItem> {
  const { vaultId, itemId } = parseItemId(item.id);
  return parseJson<OpItem>(await runOp(["item", "get", itemId, "--vault", vaultId, "--format", "json", "--reveal"]));
}

function fieldByPurpose(item: OpItem, purpose: "USERNAME" | "PASSWORD"): string | undefined {
  return item.fields?.find((field) => field.purpose === purpose)?.value || undefined;
}

function emailField(item: OpItem): string | undefined {
  return (
    item.fields?.find((field) => field.type === "EMAIL" || field.label?.toLowerCase() === "email")?.value || undefined
  );
}

async function loadAllItems(): Promise<VaultItem[]> {
  const items = parseJson<OpListItem[]>(await runOp(["item", "list", "--categories", "Login", "--format", "json"]));
  return sortVaultItems(
    items.map((item) => ({
      id: encodeItemId(item.vault.id, item.id),
      title: item.title?.trim() || "Untitled",
      subtitle: item.vault.name,
      username: item.additional_information?.trim() || undefined,
      url: primaryUrl(item),
      managerId: onePasswordAdapter.id,
    })),
  );
}

export const onePasswordAdapter: PasswordManagerAdapter = {
  id: "1password",
  name: "1Password",
  cliBinary: "op",

  async isAvailable(): Promise<AdapterStatus> {
    try {
      // Lists configured accounts without triggering an app authorization prompt.
      const accounts = parseJson<OpAccount[]>(await runOp(["account", "list", "--format", "json"]));
      return accounts.length > 0 ? { ok: true } : { ok: false, reason: NO_ACCOUNT_REASON };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  },

  async listItems(): Promise<VaultItem[]> {
    return loadAllItems();
  },

  async searchItems(query: string): Promise<VaultItem[]> {
    return filterVaultItems(await loadAllItems(), query);
  },

  async getPassword(item: VaultItem): Promise<string> {
    const { vaultId, itemId } = parseItemId(item.id);
    // `op read` reveals concealed values; `op item get --fields` would print a placeholder without --reveal.
    const password = await runOp(["read", "--no-newline", `op://${vaultId}/${itemId}/password`]);
    if (!password) {
      throw new Error(`Password not available for: ${item.title}`);
    }
    return password;
  },

  async getUsername(item: VaultItem): Promise<string | undefined> {
    return item.username ?? fieldByPurpose(await getItem(item), "USERNAME");
  },

  async getEmail(item: VaultItem): Promise<string | undefined> {
    return emailField(await getItem(item));
  },

  async getTotp(item: VaultItem): Promise<string | undefined> {
    const { vaultId, itemId } = parseItemId(item.id);
    try {
      return (await runOp(["item", "get", itemId, "--vault", vaultId, "--otp"])).trim() || undefined;
    } catch {
      return undefined; // No one-time password field.
    }
  },

  async getUrl(item: VaultItem): Promise<string | undefined> {
    return item.url ?? primaryUrl(await getItem(item));
  },

  async getItemAvailability(item: VaultItem): Promise<ItemAvailability> {
    const full = await getItem(item);
    const url = primaryUrl(full);
    return {
      hasUrl: Boolean(url),
      url,
      hasEmail: Boolean(emailField(full)),
      hasUsername: Boolean(fieldByPurpose(full, "USERNAME")),
      hasTotp: Boolean(full.fields?.some((field) => field.type === "OTP")),
      hasPassword: Boolean(fieldByPurpose(full, "PASSWORD")),
    };
  },

  async openInManager(item: VaultItem): Promise<void> {
    const { vaultId, itemId } = parseItemId(item.id);
    const [account] = parseJson<OpAccount[]>(await runOp(["account", "list", "--format", "json"]));
    if (!account) {
      throw new Error(NO_ACCOUNT_REASON);
    }
    await open(`onepassword://view-item/?a=${account.account_uuid}&v=${vaultId}&i=${itemId}`);
  },
};
