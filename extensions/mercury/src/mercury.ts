import { Clipboard, Toast } from "@raycast/api";
import { withFaker } from "@chrismessina/raycast-faker";
import { logger } from "@chrismessina/raycast-logger";

const API_BASE_URL = "https://api.mercury.com/api/v1";
export const API_HOST = "api.mercury.com";

export const TOKEN_SETTINGS_URL = "https://app.mercury.com/settings/tokens";

export const log = logger.child("[Mercury]");

/**
 * `fetch`, or in a development build with raycast-faker on, recorded fixtures with personal data
 * replaced (Twin Peaks names, shifted dates, scaled amounts) for Store screenshots. A Store build
 * gets plain `fetch`. Kept fields are enums, public fund data, and Treasury's own descriptions.
 */
const apiFetch = withFaker(fetch, {
  hosts: [API_HOST],
  keep: [
    "kind",
    "status",
    "type",
    "mercuryCategory",
    "documentType",
    "interval",
    "network",
    "security",
    "securityName",
    "tradeAction",
    "sweepDirection",
    "spendLimitType",
    "physicalCardStatus",
    "attachmentType",
  ],
  // Only Treasury's own public forms are kept verbatim: "Valuation change posted", "Dividend
  // posted: cusip:… (fund)", "Fee posted: Mercury Fee". Anything else (a sender's name) is scrubbed.
  keepIf: {
    description:
      /^(?:[A-Z][a-z]+(?: [a-z]+)* posted|Dividend posted: cusip:[A-Z0-9]+ \([^()]+\)|Fee posted: Mercury Fee)$/,
  },
  keepHosts: ["app.mercury.com"],
  names: {
    counterpartyName: "company",
    counterpartyNickname: "company",
    dbaName: "company",
    nameOnCard: "person",
    legalBusinessName: "person",
    companyLegalName: "person",
    name: "account",
    nickname: "account",
    // A card locked to one merchant names that merchant, not an account.
    "merchantLock.name": "company",
  },
  scale: [
    "amount",
    "balance",
    "currentBalance",
    "availableBalance",
    "endingBalance",
    "netAmount",
    "treasuryFee",
    "amountCents",
    "atmAmountCents",
    "remainingAmountCents",
  ],
});

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** The Copy Error action every failure toast carries. Mercury's reasons never include the token. */
export function copyErrorAction(error: unknown): Toast.ActionOptions {
  const message = error instanceof Error ? error.message : String(error);
  return { title: "Copy Error", onAction: () => Clipboard.copy(message) };
}

/** Mercury rejected the API token (HTTP 401). */
export class MercuryAuthError extends Error {}

/** Mercury refused the request for this kind of organization (e.g. /credit on a personal account). */
export class MercuryForbiddenError extends Error {}

/**
 * GET a Mercury API path with one organization's token. On failure, throws with Mercury's own
 * reason (e.g. "No matching token found") rather than the bare HTTP status text.
 * Only the reason string is kept, so the token never reaches toasts or logs.
 */
export async function mercuryGet<T>(token: string, path: string): Promise<T> {
  const request = async () => {
    log.log("GET", path);
    const started = performance.now();
    const result = await apiFetch(`${API_BASE_URL}${path}`, {
      headers: { accept: "application/json", Authorization: `Bearer ${token.trim()}` },
    });
    log.log("Response", { path, status: result.status, ms: Math.round(performance.now() - started) });
    return result;
  };
  let response = await request();
  // Mercury's gateway occasionally answers 502/503/504 to one request in a burst; a single retry
  // after a short pause almost always succeeds, so one hiccup doesn't blank an account.
  if (response.status >= 502 && response.status <= 504) {
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 600));
    response = await request();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { errors?: { message?: string } } | null;
    const reason = body?.errors?.message ?? `${response.status} ${response.statusText}`;
    // Verbose only: callers decide whether a failure is an error (e.g. /credit 403s on personal accounts).
    log.log("Request failed", { path, status: response.status, reason });
    if (response.status === 401) throw new MercuryAuthError(reason);
    if (response.status === 403) throw new MercuryForbiddenError(reason);
    throw new Error(reason);
  }

  return (await response.json()) as T;
}

interface Page {
  nextPage?: string | null;
}

/** Follow a Mercury cursor-paginated list (`page.nextPage` → `start_after`) to the end. */
export async function getAllPages<T>(token: string, path: string, key: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null | undefined;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const data = await mercuryGet<Record<string, unknown> & { page?: Page }>(
      token,
      cursor ? `${path}${separator}start_after=${encodeURIComponent(cursor)}` : path,
    );
    items.push(...((data[key] as T[]) ?? []));
    cursor = data.page?.nextPage;
  } while (cursor);
  return items;
}

export interface Organization {
  id: string;
  kind: "personal" | "business";
  legalBusinessName: string;
  dbas: Array<{ dbaName: string; dbaIsDefault: boolean }>;
}

export interface Account {
  id: string;
  name: string;
  nickname: string | null;
  accountNumber: string;
  routingNumber: string;
  status: "active" | "deleted" | "pending" | "archived";
  type: string;
  kind: string;
  currentBalance: number;
  availableBalance: number;
  legalBusinessName: string;
  dashboardLink: string;
  createdAt: string;
}

export interface TreasuryAccount {
  id: string;
  status: "active" | "deleted" | "pending" | "archived";
  createdAt: string;
  availableBalance: number;
  currentBalance: number;
  netReturns: Array<{
    month: string;
    netAmount: number;
    treasuryFee: number;
    status: "processing" | "pending" | "charged" | "error";
    dividends?: Array<{ id: string; type: string; securityName: string; amount: number }>;
  }>;
}

export interface CreditAccount {
  id: string;
  status: "active" | "deleted" | "pending" | "archived";
  createdAt: string;
  availableBalance: number;
  currentBalance: number;
}

export interface Card {
  id: string;
  accountId: string;
  lastFour: string;
  nameOnCard: string;
  nickname: string | null;
  status: "active" | "frozen" | "cancelled" | "inactive" | "expired" | "suspended";
  type: "virtual" | "physical";
  kind: "debit" | "credit";
  expiration: { month: number; year: number };
  spendLimit: { amountCents: number; atmAmountCents: number | null; interval: string } | null;
  physicalCardStatus: "inactive" | "active" | "locked" | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  counterpartyName: string;
  counterpartyNickname: string | null;
  createdAt: string;
  postedAt: string | null;
  estimatedDeliveryDate: string | null;
  failedAt: string | null;
  reasonForFailure: string | null;
  status: "pending" | "sent" | "cancelled" | "failed" | "reversed" | "blocked";
  kind: string;
  mercuryCategory: string | null;
  /** A category you set in Mercury; wins over Mercury's automatic `mercuryCategory`. */
  categoryData?: { id: string; name: string } | null;
  note: string | null;
  externalMemo: string | null;
  bankDescription: string | null;
  dashboardLink: string;
  cardId?: string | null;
  attachments?: Array<{ fileName: string; url: string; attachmentType: string }>;
}

export interface Statement {
  id: string;
  startDate: string;
  endDate: string;
  /** Bank statements only; Treasury documents don't carry one. */
  endingBalance?: number;
  downloadUrl: string;
  /** Treasury only: MonthlyStatement, TradeConfirmation, or a tax form such as 1099. */
  documentType?: string;
}

export function getOrganization(token: string) {
  return mercuryGet<{ organization: Organization }>(token, "/organization").then((data) => data.organization);
}

export function getAccounts(token: string): Promise<Account[]> {
  return getAllPages<Account>(token, "/accounts?limit=1000", "accounts");
}

export function getTreasuryAccounts(token: string): Promise<TreasuryAccount[]> {
  // Mercury's API has no name for Treasury (GET /account/{treasuryId} answers 404), so it's always "Treasury".
  return getAllPages<TreasuryAccount>(token, "/treasury", "accounts");
}

/** Credit exists only for business organizations; Mercury answers 403 for personal ones. */
export function getCreditAccounts(token: string): Promise<CreditAccount[]> {
  return mercuryGet<{ accounts: CreditAccount[] }>(token, "/credit")
    .then((data) => data.accounts)
    .catch((error) => {
      if (error instanceof MercuryForbiddenError) return [];
      throw error;
    });
}

export function getCards(token: string): Promise<Card[]> {
  return getAllPages<Card>(token, "/cards", "cards");
}

export function getStatements(token: string, accountId: string): Promise<Statement[]> {
  return getAllPages<Statement>(token, `/account/${accountId}/statements`, "statements");
}

/** Treasury's monthly statements, trade confirmations, and tax forms, in the same shape as bank statements. */
export async function getTreasuryStatements(token: string, treasuryId: string): Promise<Statement[]> {
  const documents = await getAllPages<{
    id: string;
    periodStart: string;
    periodEnd: string;
    downloadUrl: string;
    documentType: string;
  }>(token, `/treasury/${treasuryId}/statements`, "statements");
  return documents.map((document) => ({
    id: document.id,
    startDate: document.periodStart,
    endDate: document.periodEnd,
    downloadUrl: document.downloadUrl,
    documentType: document.documentType,
  }));
}
