import { getPreferenceValues, environment } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { delimiter } from "path";
import { promisify } from "util";
import {
  Item,
  ItemDetail,
  ItemType,
  PassCliError,
  PassCliErrorType,
  PasswordOptions,
  PasswordScore,
  Vault,
  VaultRole,
} from "./types";
import { MOCK_VAULTS, MOCK_ITEMS, MOCK_ITEM_DETAILS, MOCK_TOTP_CODES } from "./mock-data";
import { clearCache } from "./cache";
import { ensureCli } from "./cli";

let mockCacheCleared = false;

// Seed the extension with local demo data while running `ray develop` / `npm run dev`.
const USE_MOCK_DATA = environment.isDevelopment;
const DEFAULT_CLI_COMMAND = "pass-cli";
type CliPathPreferenceValues = { cliPath?: string };

function useMockData(): boolean {
  return USE_MOCK_DATA;
}

async function ensureMockCacheCleared(): Promise<void> {
  if (mockCacheCleared) return;
  mockCacheCleared = true;
  await clearCache();
}

const execFileAsync = promisify(execFile);

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripSurroundingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncateMiddle(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  const head = Math.max(0, Math.floor((maxLen - 1) / 2));
  const tail = Math.max(0, maxLen - head - 1);
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}

function normalizeVaultRole(value: unknown): VaultRole {
  const raw = trimOrUndefined(value)?.toLowerCase();
  switch (raw) {
    case "owner":
    case "manager":
    case "editor":
    case "viewer":
      return raw;
    default:
      return "viewer";
  }
}

function getEnhancedPath(): string {
  const home = homedir();
  const currentPath = process.env.PATH || "";

  const additionalPaths = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    `${home}/.local/bin`,
    `${home}/bin`,
    "/usr/bin",
    "/bin",
  ];

  return [...additionalPaths, currentPath].filter((p) => p.length > 0).join(delimiter);
}

function getConfiguredCliPath(): string | undefined {
  const preferences = getPreferenceValues<CliPathPreferenceValues>();
  const configured = trimOrUndefined(preferences.cliPath);
  if (!configured || configured === DEFAULT_CLI_COMMAND) {
    return undefined;
  }
  return stripSurroundingQuotes(configured);
}

async function getCliPathAsync(): Promise<string> {
  // Check if user configured a custom path
  const configured = getConfiguredCliPath();
  if (configured) {
    return configured;
  }

  // This extension is macOS-only, but keeping a non-throwing fallback here
  // avoids hard failures when code paths are executed in non-darwin environments.
  if (process.platform !== "darwin") {
    return DEFAULT_CLI_COMMAND;
  }

  // Ensure CLI is installed (auto-download if needed)
  return ensureCli();
}

function createExecEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getEnhancedPath(),
  };
}

function classifyCliError(text: string): PassCliErrorType {
  const normalized = text.toLowerCase();

  if (normalized.includes("cannot get the encryption key") || normalized.includes("error creating client features")) {
    return "keyring_error";
  }

  if (
    normalized.includes("requires an authenticated client") ||
    normalized.includes("not authenticated") ||
    normalized.includes("login required") ||
    normalized.includes("please login") ||
    normalized.includes("not logged in")
  ) {
    return "not_authenticated";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("connection") ||
    normalized.includes("dns")
  ) {
    return "network_error";
  }

  return "unknown";
}

async function execPassCli(
  cliPath: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  const baseOptions = {
    env,
    timeout: 60_000,
    maxBuffer: 20 * 1024 * 1024,
  };

  const { stdout, stderr } = await execFileAsync(cliPath, args, baseOptions);
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

async function runCli(args: string[]): Promise<string> {
  const cliPath = await getCliPathAsync();
  const env = createExecEnv();

  try {
    const { stdout } = await execPassCli(cliPath, args, env);
    return (stdout ?? "").trim();
  } catch (error: unknown) {
    const execErr = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string; stderr?: string };
    if (execErr?.killed && typeof execErr?.signal === "string") {
      throw new PassCliError("pass-cli timed out. Please try again.", "timeout");
    }

    const message = error instanceof Error ? error.message : "";
    const stderr = typeof execErr?.stderr === "string" ? execErr.stderr : "";

    const isEnoent = execErr?.code === "ENOENT" || execErr?.errno === -2;
    if (isEnoent) {
      throw new PassCliError(
        `pass-cli not found at '${cliPath}'. Install it or set the correct path in extension preferences.`,
        "not_installed",
      );
    }

    const combined = [stderr, message]
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join("\n");
    const type = classifyCliError(combined);

    if (type === "keyring_error") {
      throw new PassCliError(
        "pass-cli could not access secure key storage. Try: pass-cli logout --force, then set PROTON_PASS_KEY_PROVIDER=fs and login again.",
        "keyring_error",
      );
    }

    if (type === "not_authenticated") {
      throw new PassCliError("Not authenticated. Run pass-cli login to authenticate.", "not_authenticated");
    }

    if (type === "network_error") {
      throw new PassCliError("Network error. Check your connection and try again.", "network_error");
    }

    const safeDetails =
      combined.length > 0 ? truncateMiddle(combined, 600) : "An unknown error occurred while running pass-cli.";
    throw new PassCliError(safeDetails, "unknown");
  }
}

function parseJson<T>(text: string, context: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PassCliError(
      `Unexpected ${context} output from pass-cli. Please update pass-cli and try again.`,
      "invalid_output",
    );
  }
}

function normalizeVault(raw: unknown): Vault {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  const shareId = trimOrUndefined(raw.share_id ?? raw.shareId ?? raw.shareID ?? raw.id);
  const name = trimOrUndefined(raw.name);
  const itemCountValue = raw.itemCount ?? raw.item_count ?? raw.items_count ?? raw.itemsCount;
  const itemCount = typeof itemCountValue === "number" ? itemCountValue : Number(itemCountValue ?? 0);
  const role = normalizeVaultRole(raw.role);

  if (!shareId || !name) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  return {
    shareId,
    name,
    itemCount: Number.isFinite(itemCount) ? itemCount : 0,
    role,
  };
}

function getItemTypeFromContent(contentData: unknown): {
  type: ItemType;
  loginData: Record<string, unknown> | undefined;
} {
  if (!isRecord(contentData)) {
    return { type: "note", loginData: undefined };
  }

  if (isRecord(contentData.Login)) {
    return { type: "login", loginData: contentData.Login as Record<string, unknown> };
  }
  if (isRecord(contentData.Note) || contentData.Note !== undefined) {
    return { type: "note", loginData: undefined };
  }
  if (isRecord(contentData.CreditCard) || isRecord(contentData.credit_card)) {
    return { type: "credit_card", loginData: undefined };
  }
  if (isRecord(contentData.Identity)) {
    return { type: "identity", loginData: undefined };
  }
  if (isRecord(contentData.Alias)) {
    return { type: "alias", loginData: undefined };
  }
  if (isRecord(contentData.SshKey) || isRecord(contentData.ssh_key)) {
    return { type: "ssh_key", loginData: undefined };
  }
  if (isRecord(contentData.Wifi)) {
    return { type: "wifi", loginData: undefined };
  }

  return { type: "note", loginData: undefined };
}

function normalizeItem(raw: unknown, vaultNameOverride?: string): Item {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected item data from pass-cli.", "invalid_output");
  }

  const shareId = trimOrUndefined(raw.share_id ?? raw.shareId ?? raw.shareID ?? raw.vaultShareId ?? raw.vault_share_id);
  const itemId = trimOrUndefined(raw.id ?? raw.itemId ?? raw.item_id ?? raw.itemID);

  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const title = trimOrUndefined(outerContent.title ?? raw.title ?? raw.name);

  const innerContent = isRecord(outerContent.content) ? outerContent.content : undefined;
  const { type, loginData } = getItemTypeFromContent(innerContent);

  const username = loginData ? trimOrUndefined(loginData.username) : trimOrUndefined(raw.username);
  const email = loginData ? trimOrUndefined(loginData.email) : trimOrUndefined(raw.email);

  const totpUri = loginData ? trimOrUndefined(loginData.totp_uri ?? loginData.totpUri) : undefined;
  const hasTotp = totpUri !== undefined && totpUri.length > 0;

  const vaultName = vaultNameOverride ?? trimOrUndefined(raw.vaultName ?? raw.vault_name) ?? "Unknown Vault";

  if (!shareId || !itemId || !title) {
    throw new PassCliError("Unexpected item data from pass-cli.", "invalid_output");
  }

  return {
    shareId,
    itemId,
    title,
    type,
    vaultName,
    username,
    email,
    hasTotp,
  };
}

function normalizeCustomFields(raw: unknown): ItemDetail["customFields"] {
  if (raw === undefined || raw === null) return undefined;

  const arr = Array.isArray(raw) ? raw : undefined;
  if (!arr) return undefined;

  const mapped = arr
    .map((field) => {
      if (!isRecord(field)) return undefined;
      const name = trimOrUndefined(field.name ?? field.key);
      const value = trimOrUndefined(field.value);
      const typeRaw = trimOrUndefined(field.type)?.toLowerCase();
      const type = typeRaw === "text" ? "text" : "hidden";
      if (!name || value === undefined) return undefined;
      return { name, value, type } as const;
    })
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  return mapped.length > 0 ? mapped : undefined;
}

function normalizeStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const values = raw.map((v) => trimOrUndefined(v)).filter((v): v is string => Boolean(v));
  return values.length > 0 ? values : undefined;
}

function getTypeSpecificData(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const innerContent = isRecord(outerContent.content) ? outerContent.content : undefined;

  if (!innerContent) return undefined;

  const typeKeys = ["Login", "Note", "CreditCard", "credit_card", "Identity", "Alias", "SshKey", "ssh_key", "Wifi"];
  for (const key of typeKeys) {
    if (isRecord(innerContent[key])) {
      return innerContent[key] as Record<string, unknown>;
    }
  }

  return undefined;
}

function normalizeItemDetail(raw: unknown): ItemDetail {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected item details from pass-cli.", "invalid_output");
  }

  const base = normalizeItem(raw);

  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const typeData = getTypeSpecificData(raw);

  const password = typeData ? trimOrUndefined(typeData.password) : undefined;

  const urls = typeData ? normalizeStringArray(typeData.urls) : undefined;

  const note = trimOrUndefined(outerContent.note ?? raw.note);

  const customFields =
    normalizeCustomFields(outerContent.extra_fields) ??
    normalizeCustomFields(outerContent.extraFields) ??
    normalizeCustomFields(raw.extra_fields) ??
    normalizeCustomFields(raw.extraFields);

  return {
    ...base,
    password,
    urls,
    note,
    customFields,
  };
}

export async function checkAuth(): Promise<boolean> {
  if (useMockData()) {
    await ensureMockCacheCleared();
    return true;
  }

  try {
    await runCli(["test"]);
    return true;
  } catch (error) {
    if (error instanceof PassCliError && error.type === "not_authenticated") {
      return false;
    }
    throw error;
  }
}

export async function listVaults(): Promise<Vault[]> {
  if (useMockData()) {
    await ensureMockCacheCleared();
    return MOCK_VAULTS;
  }

  const output = await runCli(["vault", "list", "--output", "json"]);
  const data = parseJson<unknown>(output, "vault list");

  const vaultsRaw = Array.isArray(data) ? data : isRecord(data) ? (data.vaults as unknown) : undefined;
  if (!Array.isArray(vaultsRaw)) {
    throw new PassCliError("Unexpected vault list output from pass-cli.", "invalid_output");
  }

  return vaultsRaw.map(normalizeVault);
}

async function listItemsFromVault(shareId: string, vaultName: string): Promise<Item[]> {
  const args = ["item", "list", "--share-id", shareId, "--output", "json"];

  const output = await runCli(args);
  const data = parseJson<unknown>(output, "item list");

  const itemsRaw = Array.isArray(data) ? data : isRecord(data) ? (data.items as unknown) : undefined;
  if (!Array.isArray(itemsRaw)) {
    throw new PassCliError("Unexpected item list output from pass-cli.", "invalid_output");
  }

  return itemsRaw
    .filter((item) => {
      if (!isRecord(item)) return false;
      const state = trimOrUndefined(item.state);
      return state !== "Trashed";
    })
    .map((item) => normalizeItem(item, vaultName));
}

export async function listItems(shareId?: string): Promise<Item[]> {
  if (useMockData()) {
    await ensureMockCacheCleared();
    if (shareId) {
      return MOCK_ITEMS.filter((item) => item.shareId === shareId);
    }
    return MOCK_ITEMS;
  }

  if (shareId) {
    const vaults = await listVaults();
    const vault = vaults.find((v) => v.shareId === shareId);
    return listItemsFromVault(shareId, vault?.name ?? "Unknown Vault");
  }

  const vaults = await listVaults();
  const allItems: Item[] = [];

  for (const vault of vaults) {
    try {
      const items = await listItemsFromVault(vault.shareId, vault.name);
      allItems.push(...items);
    } catch (error) {
      const errorType = error instanceof PassCliError ? error.type : "unknown";
      console.error(`Failed to list items from vault ${vault.name} (${errorType}).`);
    }
  }

  return allItems;
}

function unwrapItemResponse(data: unknown): unknown {
  if (!isRecord(data)) return data;

  const wrapperKeys = ["item", "data", "result", "response", "payload"];
  for (const key of wrapperKeys) {
    if (isRecord(data[key])) {
      const inner = data[key] as Record<string, unknown>;
      for (const innerKey of wrapperKeys) {
        if (isRecord(inner[innerKey])) {
          return inner[innerKey];
        }
      }
      return inner;
    }
  }

  return data;
}

export async function getItem(shareId: string, itemId: string): Promise<ItemDetail> {
  if (useMockData()) {
    const mockDetail = MOCK_ITEM_DETAILS[itemId];
    if (mockDetail) return mockDetail;
    const mockItem = MOCK_ITEMS.find((i) => i.itemId === itemId && i.shareId === shareId);
    if (mockItem) return { ...mockItem, password: "mock-password-123" };
    throw new PassCliError("Item not found", "invalid_output");
  }

  const output = await runCli(["item", "view", "--share-id", shareId, "--item-id", itemId, "--output", "json"]);
  const data = parseJson<unknown>(output, "item view");

  const rawItem = unwrapItemResponse(data);
  return normalizeItemDetail(rawItem);
}

export async function getTotpCodes(shareId: string, itemId: string): Promise<Record<string, string>> {
  const output = await runCli(["item", "totp", "--share-id", shareId, "--item-id", itemId, "--output", "json"]);
  const data = parseJson<unknown>(output, "item totp");

  const raw = isRecord(data) && isRecord(data.totps) ? data.totps : data;
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected TOTP output from pass-cli.", "invalid_output");
  }

  const entries = Object.entries(raw)
    .map(([k, v]) => [k, trimOrUndefined(v)] as const)
    .filter((e): e is readonly [string, string] => Boolean(e[1]));

  return Object.fromEntries(entries);
}

export async function getTotp(shareId: string, itemId: string): Promise<string> {
  if (useMockData()) {
    const mockCode = MOCK_TOTP_CODES[itemId];
    if (mockCode) return mockCode;
    throw new PassCliError("No TOTP fields found for this item.", "invalid_output");
  }

  const codes = await getTotpCodes(shareId, itemId);
  const preferred = codes.totp;
  if (preferred) return preferred;

  const firstKey = Object.keys(codes).sort()[0];
  const first = firstKey ? codes[firstKey] : undefined;
  if (!first) {
    throw new PassCliError("No TOTP fields found for this item.", "invalid_output");
  }
  return first;
}

export async function generatePassword(options: PasswordOptions): Promise<string> {
  if (options.type === "random") {
    const args = ["password", "generate", "random"];
    if (options.length !== undefined) args.push("--length", options.length.toString());
    if (options.includeNumbers !== undefined) args.push("--numbers", options.includeNumbers ? "true" : "false");
    if (options.includeUppercase !== undefined) args.push("--uppercase", options.includeUppercase ? "true" : "false");
    if (options.includeSymbols !== undefined) args.push("--symbols", options.includeSymbols ? "true" : "false");
    return (await runCli(args)).trim();
  }

  const args = ["password", "generate", "memorable"];
  if (options.words !== undefined) args.push("--words", options.words.toString());
  if (options.separator !== undefined) args.push("--separator", options.separator);
  if (options.capitalize !== undefined) args.push("--capitalize", options.capitalize ? "true" : "false");
  if (options.includeNumbers !== undefined) args.push("--numbers", options.includeNumbers ? "true" : "false");
  return (await runCli(args)).trim();
}

export async function passwordScore(password: string): Promise<PasswordScore> {
  // Avoid passing passwords to external process arguments.
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
  const penaltyWeight = 7;
  const rawScore = Math.round(Math.min(100, entropy * 1.2)) - penalties.length * penaltyWeight;
  const numericScore = Math.max(0, Math.min(100, rawScore));

  let passwordScore = "Weak";
  if (numericScore >= 80) {
    passwordScore = "Strong";
  } else if (numericScore >= 60) {
    passwordScore = "Good";
  } else if (numericScore >= 35) {
    passwordScore = "Fair";
  }

  return {
    numericScore,
    passwordScore,
    penalties: penalties.length > 0 ? penalties : undefined,
  };
}
