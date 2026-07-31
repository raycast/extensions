import { callTool } from "./mcp";

/** ---- Types (mirroring confirmed Contra MCP responses) ---- */

export type InvoiceStatus =
  | "CANCELLED"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "PAST_DUE"
  | "PENDING_APPROVAL"
  | "REFUNDED"
  | "REJECTED"
  | "SCHEDULED"
  | "UNPAID";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceUrl: string;
  title: string | null;
  clientName: string | null;
  contractorName: string | null;
  status: InvoiceStatus;
  totalAmount: string; // pre-formatted, e.g. "$495.00"
  issueDate: string | null;
  dueDate: string | null;
  isPastDue: boolean;
  isPayable: boolean;
  linkedProject: { id: string; status: string; title: string } | null;
}

export interface Balance {
  available: string; // "USD:10036.90000000"
  escrow: string;
  pending: string;
}

export interface Transaction {
  id: string;
  amount: string; // "USD:55.00000000"
  description: string;
  statusLabel: string;
  transactionTime: string;
  type: string;
  paidProject: { paidProjectId: string; title: string } | null;
  paymentLink: { slug: string; title: string } | null;
}

/** Every invoice status — used when we need the full ledger, not just actionable. */
export const ALL_INVOICE_STATUSES: InvoiceStatus[] = [
  "CANCELLED",
  "PAID",
  "PARTIALLY_REFUNDED",
  "PAST_DUE",
  "PENDING_APPROVAL",
  "REFUNDED",
  "REJECTED",
  "SCHEDULED",
  "UNPAID",
];

const OUTSTANDING_STATUSES: InvoiceStatus[] = [
  "UNPAID",
  "PAST_DUE",
  "SCHEDULED",
  "PENDING_APPROVAL",
];
export { OUTSTANDING_STATUSES };

/** A real engagement, derived from invoices' linkedProject (PaidProjectV2). */
export interface ActiveProject {
  id: string;
  title: string;
  status: string; // IN_PROGRESS | COMPLETED | ...
  clientName: string | null;
  totalInvoiced: number;
  invoiceCount: number;
  lastActivity: string | null; // ISO date of most recent invoice
  lastInvoiceUrl: string | null;
}

export interface ChatParticipant {
  fullName: string | null;
  displayUsername: string | null;
  organizationName: string | null;
  title: string | null;
}

export interface Conversation {
  chatConversationId: string;
  title: string;
  unreadMessageCount: number;
  createdAt: string;
  /** Present when the MCP API returns a direct link to this conversation. */
  conversationUrl?: string | null;
  otherParticipants: ChatParticipant[];
  latestMessage: {
    author: { fullName: string | null; displayUsername: string | null };
    bodyPlaintext: string;
    createdAt: string;
    visitorHasRead: boolean;
  } | null;
}

export interface WhoAmI {
  emailAddress: string;
  displayUsername: string;
  firstName: string | null;
  lastName: string | null;
  selectedUserType: string;
}

/** ---- API wrappers ---- */

export async function listInvoicesSent(
  statuses?: InvoiceStatus[],
): Promise<Invoice[]> {
  const res = await callTool<{ invoices: Invoice[] }>("list_invoices_sent", {
    pageSize: 50,
    ...(statuses ? { statuses } : {}),
  });
  return res.invoices ?? [];
}

export async function listInvoicesReceivable(
  statuses?: InvoiceStatus[],
): Promise<Invoice[]> {
  const res = await callTool<{ invoices: Invoice[] }>(
    "list_invoices_receivable",
    {
      pageSize: 50,
      ...(statuses ? { statuses } : {}),
    },
  );
  return res.invoices ?? [];
}

/** Fetches the balance plus wallet transactions (first `maxPages` pages). */
export async function getWallet(maxPages = 2): Promise<{
  balance: Balance;
  transactions: Transaction[];
}> {
  let balance: Balance = {
    available: "USD:0",
    escrow: "USD:0",
    pending: "USD:0",
  };
  const transactions: Transaction[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await callTool<{
      balance: Balance;
      transactions: Transaction[];
      pageCount: number;
    }>("list_contractor_transactions", { pageSize: 100, pageIndex: page });
    if (page === 1 && res.balance) balance = res.balance;
    const batch = res.transactions ?? [];
    transactions.push(...batch);
    if (batch.length < 100 || page >= (res.pageCount ?? page)) break;
  }
  return { balance, transactions };
}

/** Fetches sent invoices across up to `maxPages` pages. */
export async function listAllInvoicesSent(
  statuses?: InvoiceStatus[],
  maxPages = 2,
): Promise<Invoice[]> {
  const all: Invoice[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await callTool<{ invoices: Invoice[]; count: number }>(
      "list_invoices_sent",
      { pageSize: 100, pageIndex: page, ...(statuses ? { statuses } : {}) },
    );
    const batch = res.invoices ?? [];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Derives active engagements from invoices. Contra exposes no direct
 * "list projects" tool, but each invoice carries its linkedProject
 * (PaidProjectV2) with a real status, so we group by project.
 */
export function deriveProjects(invoices: Invoice[]): ActiveProject[] {
  const map = new Map<string, ActiveProject>();
  for (const inv of invoices) {
    const lp = inv.linkedProject;
    if (!lp) continue;
    const amount = parseFormattedAmount(inv.totalAmount);
    const existing = map.get(lp.id);
    if (existing) {
      existing.totalInvoiced += amount;
      existing.invoiceCount += 1;
      if (
        !existing.lastActivity ||
        (inv.issueDate ?? "") > existing.lastActivity
      ) {
        existing.lastActivity = inv.issueDate;
        existing.lastInvoiceUrl = inv.invoiceUrl;
        existing.status = lp.status; // newest invoice reflects current status
      }
    } else {
      map.set(lp.id, {
        id: lp.id,
        title: lp.title,
        status: lp.status,
        clientName: inv.clientName,
        totalInvoiced: amount,
        invoiceCount: 1,
        lastActivity: inv.issueDate,
        lastInvoiceUrl: inv.invoiceUrl,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""),
  );
}

export async function listConversations(unreadOnly = false): Promise<{
  conversations: Conversation[];
  totalUnread: number;
}> {
  const res = await callTool<{ conversations: Conversation[] }>(
    "list_chat_conversations",
    { first: 50, view: "ACTIVE", ...(unreadOnly ? { unreadOnly: true } : {}) },
  );
  const conversations = res.conversations ?? [];
  const totalUnread = conversations.reduce(
    (n, c) => n + (c.unreadMessageCount || 0),
    0,
  );
  return { conversations, totalUnread };
}

/** Returns a per-conversation URL when the MCP response includes one. */
export function getConversationUrl(conversation: Conversation): string | null {
  if (conversation.conversationUrl) return conversation.conversationUrl;
  return null;
}

export async function whoami(): Promise<WhoAmI | null> {
  const res = await callTool<{
    visitor?: { userAccount?: { emailAddress: string; profile: WhoAmI } };
  }>("whoami");
  const acct = res.visitor?.userAccount;
  if (!acct) return null;
  return { ...acct.profile, emailAddress: acct.emailAddress } as WhoAmI;
}

/** ---- Earnings ---- */

export interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  prevMonth: number;
  lifetime: number;
}

/** True if a wallet transaction is real income (money in), not a payout or bill. */
export function isIncome(t: Transaction): boolean {
  if (t.statusLabel !== "SUCCEEDED") return false;
  return !/Payout|BillPayment/i.test(t.type);
}

/**
 * Buckets real wallet income by transaction time. This counts ALL money in —
 * project payments, standalone invoices, payment-link sales, and referral
 * rewards — matching the wallet, unlike invoice-only totals. Assumes USD.
 */
export function computeEarnings(
  transactions: Transaction[],
  now = new Date(),
): Earnings {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7)); // Monday
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const e: Earnings = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    prevMonth: 0,
    lifetime: 0,
  };
  for (const t of transactions) {
    if (!isIncome(t)) continue;
    const amount = parseMoney(t.amount).amount;
    const d = new Date(t.transactionTime);
    e.lifetime += amount;
    if (Number.isNaN(d.getTime())) continue;
    if (d >= startOfDay) e.today += amount;
    if (d >= startOfWeek) e.thisWeek += amount;
    if (d >= startOfMonth) e.thisMonth += amount;
    else if (d >= startOfPrevMonth) e.prevMonth += amount;
  }
  return e;
}

/** Extract numeric value from a pre-formatted "$1,950.00" string. */
export function parseFormattedAmount(
  formatted: string | null | undefined,
): number {
  if (!formatted) return 0;
  return Number(formatted.replace(/[^0-9.-]/g, "")) || 0;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** ---- Formatting helpers ---- */

/** Parses "USD:10036.90000000" → { currency: "USD", amount: 10036.9 }. */
export function parseMoney(raw: string | undefined | null): {
  currency: string;
  amount: number;
} {
  if (!raw) return { currency: "USD", amount: 0 };
  const [currency, value] = raw.includes(":") ? raw.split(":") : ["USD", raw];
  return { currency, amount: Number(value) || 0 };
}

export function formatMoney(raw: string | undefined | null): string {
  const { currency, amount } = parseMoney(raw);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Sum a list of "USD:..." money strings (assumes single currency). */
export function sumMoney(raws: (string | undefined | null)[]): {
  currency: string;
  amount: number;
} {
  let currency = "USD";
  let amount = 0;
  for (const raw of raws) {
    const m = parseMoney(raw);
    currency = m.currency;
    amount += m.amount;
  }
  return { currency, amount };
}

export function formatAmount(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const due = new Date(date).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / 86_400_000);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
