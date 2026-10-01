import { environment, getPreferenceValues, open } from "@raycast/api";
import { homedir } from "node:os";
import { delimiter } from "node:path";
import { clearCache } from "./cache";
import { ensureCli } from "./cli";
import { createPassCliAdapter, PassCliAdapter } from "./core/adapter";
import { runBrowserLogin } from "./core/login";
import { MOCK_ITEM_DETAILS, MOCK_ITEMS, MOCK_TOTP_CODES, MOCK_VAULTS } from "./mock-data";
import { Item, ItemDetail, PassCliError, PasswordOptions, PasswordScore, Vault } from "./types";

const USE_MOCK_DATA = environment.isDevelopment;
const DEFAULT_CLI_COMMAND = "pass-cli";
const LOGIN_TIMEOUT_MS = 10 * 60_000;
type CliPathPreferenceValues = { cliPath?: string };

let mockCacheCleared = false;

async function ensureMockCacheCleared(): Promise<void> {
  if (mockCacheCleared) return;
  mockCacheCleared = true;
  await clearCache();
}

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function stripSurroundingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getEnhancedPath(): string {
  const currentPath = process.env.PATH || "";
  if (process.platform === "win32") return currentPath;

  const home = homedir();
  return ["/opt/homebrew/bin", "/usr/local/bin", `${home}/.local/bin`, `${home}/bin`, "/usr/bin", "/bin", currentPath]
    .filter(Boolean)
    .join(delimiter);
}

function getConfiguredCliPath(): string | undefined {
  const configured = trimOrUndefined(getPreferenceValues<CliPathPreferenceValues>().cliPath);
  if (!configured || configured === DEFAULT_CLI_COMMAND) return undefined;
  return stripSurroundingQuotes(configured);
}

async function getCliPath(): Promise<string> {
  return getConfiguredCliPath() ?? ensureCli();
}

async function getAdapter(): Promise<PassCliAdapter> {
  const cliPath = await getCliPath();
  return createPassCliAdapter(
    { file: cliPath, args: [] },
    {
      env: { ...process.env, PATH: getEnhancedPath() },
    },
  );
}

export async function loginWithBrowser(): Promise<void> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return;
  }

  const cliPath = await getCliPath();
  await runBrowserLogin(
    { file: cliPath, args: [] },
    {
      openUrl: (url) => open(url),
      timeoutMs: LOGIN_TIMEOUT_MS,
    },
  );
  // The new session may belong to another account, so don't show the previous session's cached items.
  await clearCache();
}

export async function checkAuth(): Promise<boolean> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return true;
  }
  return (await getAdapter()).checkAuth();
}

export async function listVaults(): Promise<Vault[]> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return MOCK_VAULTS;
  }
  try {
    return await (await getAdapter()).listVaults();
  } catch (error) {
    // Cached items belong to the session that wrote them: once it has ended, they must not show up again.
    if (error instanceof PassCliError && error.type === "not_authenticated") await clearCache();
    throw error;
  }
}

async function listItemsFromVault(shareId: string, vaultName: string): Promise<Item[]> {
  try {
    return await (await getAdapter()).listItems(shareId, vaultName);
  } catch (error) {
    // As in listVaults(): items cached by an ended session must not show up again.
    if (error instanceof PassCliError && error.type === "not_authenticated") await clearCache();
    throw error;
  }
}

// Each pass-cli call takes ~0.5-1.5s, so listing vaults one after another adds up quickly
// for accounts with many vaults. Run a bounded number of calls in parallel instead.
const VAULT_LIST_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(values: T[], limit: number, fn: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await fn(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

/** A vault whose items couldn't be listed. */
export interface VaultFailure {
  vault: Vault;
  message: string;
}

async function listItemsOfVaults(vaults: Vault[]): Promise<{ items: Item[]; failedVaults: VaultFailure[] }> {
  const failedVaults: VaultFailure[] = [];
  const itemsPerVault = await mapWithConcurrency(vaults, VAULT_LIST_CONCURRENCY, async (vault) => {
    try {
      return await listItemsFromVault(vault.shareId, vault.name);
    } catch (error) {
      // An ended session concerns every vault, so it fails the whole listing.
      if (error instanceof PassCliError && error.type === "not_authenticated") throw error;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to list items from vault ${vault.name}: ${message}`);
      failedVaults.push({ vault, message });
      return [];
    }
  });
  return { items: itemsPerVault.flat(), failedVaults };
}

export async function listItems(shareId?: string, vaults?: Vault[]): Promise<Item[]> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return shareId ? MOCK_ITEMS.filter((item) => item.shareId === shareId) : MOCK_ITEMS;
  }

  const knownVaults = vaults ?? (await listVaults());
  if (shareId) {
    const vault = knownVaults.find((candidate) => candidate.shareId === shareId);
    return listItemsFromVault(shareId, vault?.name ?? "Unknown Vault");
  }

  return (await listItemsOfVaults(knownVaults)).items;
}

/**
 * Lists vaults once and reuses them for the item listing, instead of listing vaults twice. Vaults whose items
 * couldn't be listed are reported rather than thrown, so the other vaults still load.
 */
export async function listVaultsAndItems(): Promise<{ vaults: Vault[]; items: Item[]; failedVaults: VaultFailure[] }> {
  const vaults = await listVaults();
  if (USE_MOCK_DATA) return { vaults, items: await listItems(undefined, vaults), failedVaults: [] };
  return { vaults, ...(await listItemsOfVaults(vaults)) };
}

export async function getItem(shareId: string, itemId: string, vaultName?: string): Promise<ItemDetail> {
  if (USE_MOCK_DATA) {
    const detail = MOCK_ITEM_DETAILS[itemId];
    if (detail) return detail;
    const item = MOCK_ITEMS.find((candidate) => candidate.itemId === itemId && candidate.shareId === shareId);
    if (item) return { ...item, password: "mock-password-123" };
    throw new PassCliError("Item not found", "invalid_output");
  }
  return (await getAdapter()).getItem(shareId, itemId, vaultName);
}

export async function getTotpCodes(shareId: string, itemId: string): Promise<Record<string, string>> {
  return (await getAdapter()).getTotpCodes(shareId, itemId);
}

export async function getTotp(shareId: string, itemId: string): Promise<string> {
  if (USE_MOCK_DATA) {
    const code = MOCK_TOTP_CODES[itemId];
    if (code) return code;
    throw new PassCliError("No TOTP fields found for this item.", "invalid_output");
  }

  const codes = await getTotpCodes(shareId, itemId);
  if (codes.totp) return codes.totp;
  const first = Object.keys(codes)
    .sort()
    .map((key) => codes[key])
    .find(Boolean);
  if (!first) throw new PassCliError("No TOTP fields found for this item.", "invalid_output");
  return first;
}

export async function generatePassword(options: PasswordOptions): Promise<string> {
  return (await getAdapter()).generatePassword(options);
}

export async function passwordScore(password: string): Promise<PasswordScore> {
  const penalties: string[] = [];
  if (password.length < 12) penalties.push("Use at least 12 characters");
  if (!/[a-z]/.test(password)) penalties.push("Add lowercase letters");
  if (!/[A-Z]/.test(password)) penalties.push("Add uppercase letters");
  if (!/[0-9]/.test(password)) penalties.push("Add numbers");
  if (!/[^a-zA-Z0-9]/.test(password)) penalties.push("Add symbols");
  if (/(.)\1{2,}/.test(password)) penalties.push("Avoid repeated characters");
  if (/(?:password|letmein|welcome|admin|qwerty|123456)/i.test(password)) penalties.push("Avoid common patterns");
  if (/(?:0123|1234|2345|abcd|qwer|asdf|zxcv)/i.test(password)) penalties.push("Avoid sequences");

  let characterPool = 0;
  if (/[a-z]/.test(password)) characterPool += 26;
  if (/[A-Z]/.test(password)) characterPool += 26;
  if (/[0-9]/.test(password)) characterPool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) characterPool += 33;

  const entropy = characterPool > 0 ? Math.log2(characterPool) * password.length : 0;
  const numericScore = Math.max(0, Math.min(100, Math.round(Math.min(100, entropy * 1.2)) - penalties.length * 7));
  const score = numericScore >= 80 ? "Strong" : numericScore >= 60 ? "Good" : numericScore >= 35 ? "Fair" : "Weak";
  return { numericScore, passwordScore: score, penalties: penalties.length ? penalties : undefined };
}
