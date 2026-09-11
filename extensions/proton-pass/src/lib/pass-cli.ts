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
  return (await getAdapter()).listVaults();
}

async function listItemsFromVault(shareId: string, vaultName: string): Promise<Item[]> {
  return (await getAdapter()).listItems(shareId, vaultName);
}

export async function listItems(shareId?: string): Promise<Item[]> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return shareId ? MOCK_ITEMS.filter((item) => item.shareId === shareId) : MOCK_ITEMS;
  }

  const vaults = await listVaults();
  if (shareId) {
    const vault = vaults.find((candidate) => candidate.shareId === shareId);
    return listItemsFromVault(shareId, vault?.name ?? "Unknown Vault");
  }

  const allItems: Item[] = [];
  for (const vault of vaults) {
    try {
      allItems.push(...(await listItemsFromVault(vault.shareId, vault.name)));
    } catch (error) {
      const type = error instanceof PassCliError ? error.type : "unknown";
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to list items from vault ${vault.name} (${type}): ${message}`);
    }
  }
  return allItems;
}

export async function getItem(shareId: string, itemId: string): Promise<ItemDetail> {
  if (USE_MOCK_DATA) {
    const detail = MOCK_ITEM_DETAILS[itemId];
    if (detail) return detail;
    const item = MOCK_ITEMS.find((candidate) => candidate.itemId === itemId && candidate.shareId === shareId);
    if (item) return { ...item, password: "mock-password-123" };
    throw new PassCliError("Item not found", "invalid_output");
  }
  return (await getAdapter()).getItem(shareId, itemId);
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
