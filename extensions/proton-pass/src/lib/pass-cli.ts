import { environment, getPreferenceValues, open } from "@raycast/api";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { clearCache } from "./cache";
import { ensureCli } from "./cli";
import { createPassCliAdapter, PassCliAdapter } from "./core/adapter";
import {
  BrowserLoginStatus,
  cancelDetachedLogin,
  checkDetachedLogin,
  forgetDetachedLogin,
  isDetachedLoginRunning,
  savedDetachedLogin,
  startDetachedLogin,
} from "./core/login";
import { MOCK_ITEM_DETAILS, MOCK_ITEMS, MOCK_TOTP_CODES, MOCK_VAULTS } from "./mock-data";
import { isSharedWithMe, listedUnder, SHARED_WITH_ME, withoutDuplicates } from "./shared-items";
import { itemKey } from "./format";
import { generateTotp, parseOtpauthUri } from "./totp";
import { Item, ItemDetail, PassCliError, PasswordOptions, PasswordScore, Vault, VaultSharing } from "./types";

const USE_MOCK_DATA = environment.isDevelopment;
const DEFAULT_CLI_COMMAND = "pass-cli";
/** How long pass-cli may take to print the login URL. */
const LOGIN_URL_TIMEOUT_MS = 30_000;
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

/** The pass-cli the extension runs: the CLI Path preference when set, otherwise the one it installed. */
export async function getCliPath(): Promise<string> {
  return getConfiguredCliPath() ?? ensureCli();
}

/** Where the browser login keeps its state while it runs, so that it's found again after Raycast closed. */
const loginDir = () => join(environment.supportPath, "login");

/** The session check in flight, which every other command waits for: see endedSessionError. */
let sessionCheck: Promise<unknown> | undefined;

async function getAdapter(): Promise<PassCliAdapter> {
  await sessionCheck?.catch(() => undefined);
  // A pass-cli command running while a login saves its session can make pass-cli delete that session.
  if (await isDetachedLoginRunning(loginDir())) {
    throw new PassCliError("Finish logging in in your browser first.", "not_authenticated");
  }
  const cliPath = await getCliPath();
  return createPassCliAdapter(
    { file: cliPath, args: [] },
    {
      env: { ...process.env, PATH: getEnhancedPath() },
    },
  );
}

/**
 * Starts a browser login and opens its page. The login keeps going if Raycast closes meanwhile: checkBrowserLogin()
 * follows it. Returns the page's URL, or nothing when there's nothing to wait for.
 */
export async function startBrowserLogin(): Promise<string | undefined> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return undefined;
  }

  // The new session may belong to another account: no view may show the previous one's cached items, whichever
  // view opens first once the login completes.
  await clearCache();
  const cliPath = await getCliPath();
  const url = await startDetachedLogin({ file: cliPath, args: [] }, loginDir(), LOGIN_URL_TIMEOUT_MS);
  try {
    await open(url);
  } catch (error) {
    // Nobody can finish this login, and while it runs, no other pass-cli command does.
    await cancelDetachedLogin(loginDir());
    throw error;
  }
  return url;
}

/** Where the browser login is: still waiting for the browser, logged in, or failed. */
export async function checkBrowserLogin(): Promise<BrowserLoginStatus> {
  if (USE_MOCK_DATA) return { state: "none" };

  const status = await checkDetachedLogin(loginDir(), checkAuth);
  if (status.state === "failed") console.error(`Browser login failed: ${status.error.message}`);
  return status;
}

export async function cancelBrowserLogin(): Promise<void> {
  if (!USE_MOCK_DATA) await cancelDetachedLogin(loginDir());
}

/**
 * Ends the session, which pass-cli shares with the terminal, and clears the extension's cache. `force` only removes it
 * from this computer, for when ending it on Proton's servers fails.
 */
export async function logout(force = false): Promise<void> {
  if (USE_MOCK_DATA) return clearCache();
  // A login running now stops Logout (see getAdapter), so this one is over. One started meanwhile must keep going.
  const endedLogin = await savedDetachedLogin(loginDir());
  await (await getAdapter()).logout(force);
  await clearCache();
  // Its result would otherwise show on the next login screen.
  if (endedLogin) await forgetDetachedLogin(loginDir(), endedLogin);
}

export async function checkAuth(): Promise<boolean> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return true;
  }
  return (await getAdapter()).checkAuth();
}

/**
 * How long saved items wait for endedSessionError before showing anyway: pass-cli usually answers in under a second,
 * but can take many seconds after a while unused.
 */
export const SESSION_CHECK_WAIT_MS = 1_000;

/**
 * The error to show when pass-cli says the session has ended, so that saved items don't show meanwhile. Nothing when
 * the session is open, or when pass-cli can't tell, e.g. offline: saved items can still show then.
 *
 * Other commands wait for it. After half an hour unused, pass-cli first catches up with the account's changes, which
 * can take several seconds, and each command started meanwhile does it again: an item opened then would take as long
 * again. Once this check is done, pass-cli is up to date for them.
 */
export async function endedSessionError(): Promise<PassCliError | undefined> {
  const check = checkAuth();
  sessionCheck = check;
  try {
    if (await check) return undefined;
  } catch {
    return undefined;
  } finally {
    if (sessionCheck === check) sessionCheck = undefined;
  }
  // Cached items belong to the session that wrote them.
  await clearCache();
  return new PassCliError("Not authenticated. Run pass-cli login to authenticate.", "not_authenticated");
}

// Each pass-cli call takes ~0.5-1.5s, so listing vaults one after another adds up quickly
// for accounts with many vaults. Run a bounded number of calls in parallel instead.
const VAULT_LIST_CONCURRENCY = 8;

/** Runs at most `limit` tasks at once, in the order they come: for listings that start at different times. */
function createLimiter(limit: number) {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async function run<R>(task: () => Promise<R>): Promise<R> {
    if (running < limit) running++;
    // A finishing task hands its place over.
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running--;
    }
  };
}

/**
 * Shared by every listing command, of vaults, shares, items or members: listings can overlap, e.g. the vault list,
 * the item list it opens and a refresh, and together still run at most 8 pass-cli commands at once.
 */
const listingCommands = createLimiter(VAULT_LIST_CONCURRENCY);

export async function listVaults(): Promise<Vault[]> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return MOCK_VAULTS;
  }
  try {
    return await listingCommands(async () => (await getAdapter()).listVaults());
  } catch (error) {
    // Cached items belong to the session that wrote them: once it has ended, they must not show up again.
    if (error instanceof PassCliError && error.type === "not_authenticated") await clearCache();
    throw error;
  }
}

/**
 * The otpauth URIs of the logins this command listed, by item. They are TOTP secrets: held in memory only, never cached,
 * so that codes can be generated here rather than asked of pass-cli one by one.
 */
const totpUris = new Map<string, string>();

async function listItemsFromVault(shareId: string, vaultName: string): Promise<Item[]> {
  try {
    return await (
      await getAdapter()
    ).listItems(shareId, vaultName, (itemId, uri) => totpUris.set(itemKey({ shareId, itemId }), uri));
  } catch (error) {
    if (error instanceof PassCliError && error.type === "not_authenticated") {
      totpUris.clear();
      await clearCache();
    }
    throw error;
  }
}

/** The current TOTP code of a listed login, generated from its otpauth URI. Nothing until the item has been listed. */
export function localTotpCode(shareId: string, itemId: string): string | undefined {
  const uri = totpUris.get(itemKey({ shareId, itemId }));
  const params = uri ? parseOtpauthUri(uri) : undefined;
  return params ? generateTotp(params).code : undefined;
}

/** Share IDs of the items shared with the user on their own, outside their vaults. */
async function listItemShares(): Promise<string[]> {
  try {
    return await listingCommands(async () => (await getAdapter()).listItemShares());
  } catch (error) {
    if (error instanceof PassCliError && error.type === "not_authenticated") await clearCache();
    throw error;
  }
}

/** A vault whose items couldn't be listed. */
export interface VaultFailure {
  vault: Vault;
  message: string;
  /** For Shared with Me, the shares that failed, as each shared item has its own. Missing when the vault failed whole. */
  shareIds?: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/** A share to list items from: a vault, or an item shared with the user, listed under Shared with Me. */
interface ItemSource {
  shareId: string;
  vault: Vault;
}

const vaultSources = (vaults: Vault[]): ItemSource[] =>
  vaults.filter((vault) => !isSharedWithMe(vault)).map((vault) => ({ shareId: vault.shareId, vault }));

const sharedSources = (shareIds: string[]): ItemSource[] =>
  shareIds.map((shareId) => ({ shareId, vault: SHARED_WITH_ME }));

async function listItemsOfSources(sources: ItemSource[]): Promise<{ items: Item[]; failedVaults: VaultFailure[] }> {
  const failures = new Map<string, VaultFailure>();
  const listSource = async ({ shareId, vault }: ItemSource): Promise<Item[]> => {
    try {
      const items = await listItemsFromVault(shareId, vault.name);
      // A shared item is only reachable through its own share, whichever share pass-cli prints.
      return isSharedWithMe(vault) ? items.map((item) => ({ ...item, shareId, sharedWithMe: true })) : items;
    } catch (error) {
      // An ended session concerns every vault, so it fails the whole listing.
      if (error instanceof PassCliError && error.type === "not_authenticated") throw error;
      const message = errorMessage(error);
      console.error(`Failed to list items from vault ${vault.name}: ${message}`);
      // Shared items have a share each, but are shown together: one failure names the shares that failed.
      const failure = failures.get(vault.shareId) ?? { vault, message };
      if (isSharedWithMe(vault)) failure.shareIds = [...(failure.shareIds ?? []), shareId];
      failures.set(vault.shareId, failure);
      return [];
    }
  };
  const itemsPerSource = await Promise.all(sources.map((source) => listingCommands(() => listSource(source))));
  return { items: itemsPerSource.flat(), failedVaults: Array.from(failures.values()) };
}

export async function listItems(shareId?: string, vaults?: Vault[]): Promise<Item[]> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return shareId ? MOCK_ITEMS.filter((item) => listedUnder(item) === shareId) : MOCK_ITEMS;
  }

  const knownVaults = vaults ?? (await listVaults());
  if (shareId) {
    const vault = knownVaults.find((candidate) => candidate.shareId === shareId);
    return listingCommands(() => listItemsFromVault(shareId, vault?.name ?? "Unknown Vault"));
  }

  return (await listItemsOfSources(vaultSources(knownVaults))).items;
}

/**
 * Lists vaults once and reuses them for the item listing, instead of listing vaults twice. Items shared with the user
 * on their own come with them, under Shared with Me, which is added to the vaults when there are any. Vaults whose
 * items couldn't be listed are reported rather than thrown, so the other vaults still load.
 */
export async function listVaultsAndItems(): Promise<{ vaults: Vault[]; items: Item[]; failedVaults: VaultFailure[] }> {
  if (USE_MOCK_DATA) {
    const items = await listItems();
    const vaults = items.some((item) => item.sharedWithMe) ? [...MOCK_VAULTS, SHARED_WITH_ME] : MOCK_VAULTS;
    return { vaults, items, failedVaults: [] };
  }

  // The vaults' items and the shared ones each start as soon as their shares are known, which can take seconds for the
  // shared ones.
  const ownListing = listVaults().then(async (vaults) => ({
    vaults,
    ...(await listItemsOfSources(vaultSources(vaults))),
  }));
  const sharedListing = listItemShares().then(
    (shareIds) => listItemsOfSources(sharedSources(shareIds)),
    (error: unknown) => {
      // A failure only concerns Shared with Me.
      if (error instanceof PassCliError && error.type === "not_authenticated") throw error;
      return { items: [], failedVaults: [{ vault: SHARED_WITH_ME, message: errorMessage(error) }] };
    },
  );
  const [own, shared] = await Promise.all([ownListing, sharedListing]);
  const items = withoutDuplicates([...own.items, ...shared.items]);
  const failures = [...own.failedVaults, ...shared.failedVaults];
  // Shared with Me also shows when its items failed to load, so that the ones known already stay.
  const hasShared = items.some((item) => item.sharedWithMe) || failures.some(({ vault }) => isSharedWithMe(vault));
  return { vaults: hasShared ? [...own.vaults, SHARED_WITH_ME] : own.vaults, items, failedVaults: failures };
}

/**
 * How each vault is shared, by share ID. Vaults the user doesn't own were shared with them; for the user's own
 * vaults, the members are counted, one call per vault, in parallel like the item listing. A count that fails
 * leaves `isShared` unknown.
 */
export async function listVaultSharing(): Promise<Map<string, VaultSharing>> {
  if (USE_MOCK_DATA) {
    await ensureMockCacheCleared();
    return new Map(
      MOCK_VAULTS.flatMap((vault) =>
        vault.role ? [[vault.shareId, { role: vault.role, isShared: vault.role !== "owner" || vault.isShared }]] : [],
      ),
    );
  }

  const roles = Array.from(await listingCommands(async () => (await getAdapter()).listVaultRoles()));
  return new Map(
    await Promise.all(
      roles.map(([shareId, role]) =>
        listingCommands(async (): Promise<[string, VaultSharing]> => {
          if (role !== "owner") return [shareId, { role, isShared: true }];
          const members = await (await getAdapter()).countVaultMembers(shareId).catch(() => undefined);
          return [shareId, { role, isShared: members === undefined ? undefined : members > 1 }];
        }),
      ),
    ),
  );
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
