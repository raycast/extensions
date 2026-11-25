import {
  Account,
  AccountStage,
  BillingRenewalTerm,
  Case,
  CaseHistoryType,
  CaseStatus,
  Person,
  Subscription,
} from "./types";

// Plain color names, mapped to Raycast's Color enum in the UI layer so this stays testable.
export type StatusColor = "green" | "yellow" | "orange" | "red" | "secondary";

export function accountStageColor(stage: AccountStage | undefined): StatusColor {
  switch (stage) {
    case AccountStage.Subscribing:
      return "green";
    case AccountStage.Trialing:
      return "yellow";
    case AccountStage.Cancelling:
    case AccountStage.CancellingTrial:
    case AccountStage.Paused:
      return "orange";
    case AccountStage.PastDue:
    case AccountStage.Expired:
    case AccountStage.TrialExpired:
      return "red";
    default:
      return "secondary";
  }
}

export function caseStatusLabel(status: CaseStatus | undefined): string {
  switch (status) {
    case CaseStatus.Open:
      return "Open";
    case CaseStatus.Closed:
      return "Closed";
    case CaseStatus.Spam:
      return "Spam";
    default:
      return "—";
  }
}

const termLabels: Record<BillingRenewalTerm, string> = {
  [BillingRenewalTerm.Monthly]: "month",
  [BillingRenewalTerm.Yearly]: "year",
  [BillingRenewalTerm.Quarterly]: "quarter",
  [BillingRenewalTerm.OneTime]: "one time",
};

export function formatMoney(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** "$35 / month", "$312 / year", "$99 one time". Uses the subscription's own rate, never an estimate. */
export function formatSubscriptionPrice(subscription: Subscription | null | undefined): string {
  if (!subscription) return "—";
  const rate = subscription.Rate ?? planRateForTerm(subscription);
  const term = subscription.BillingRenewalTerm;
  if (rate === null || rate === undefined || !term) return "—";
  const quantity = subscription.Quantity && subscription.Quantity > 1 ? ` × ${subscription.Quantity}` : "";
  const price = formatMoney(rate);
  return term === BillingRenewalTerm.OneTime
    ? `${price}${quantity} one time`
    : `${price}${quantity} / ${termLabels[term]}`;
}

function planRateForTerm(subscription: Subscription): number | undefined {
  const plan = subscription.Plan;
  switch (subscription.BillingRenewalTerm) {
    case BillingRenewalTerm.Monthly:
      return plan?.MonthlyRate;
    case BillingRenewalTerm.Yearly:
      return plan?.AnnualRate;
    case BillingRenewalTerm.Quarterly:
      return plan?.QuarterlyRate;
    case BillingRenewalTerm.OneTime:
      return plan?.OneTimeRate;
    default:
      return undefined;
  }
}

export function personName(person: Person | null | undefined): string {
  if (!person) return "—";
  const name = person.FullName?.trim() || [person.FirstName, person.LastName].filter(Boolean).join(" ").trim();
  return name || person.Email || "—";
}

export function primaryAccount(person: Person): Account | undefined {
  const links = person.PersonAccount ?? [];
  return (links.find((link) => link.IsPrimary) ?? links[0])?.Account ?? undefined;
}

export function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  // Outseta returns UTC timestamps without a zone suffix.
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    : "—";
}

/** Plain text from the agent's reply box to the simple HTML Outseta stores. */
export function plainTextToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function adminUrl(subdomain: string, kind: "person" | "account" | "case", uid: string): string {
  const path = { person: "crm/people", account: "crm/accounts", case: "support/tickets" }[kind];
  return `https://${subdomain}.outseta.com/#/app/${path}/${uid}`;
}

export function stripeCustomerUrl(stripeId: string): string {
  return `https://dashboard.stripe.com/customers/${stripeId}`;
}

export function caseTitle(supportCase: Case): string {
  return supportCase.Subject?.trim() || "(no subject)";
}

// Only links that are safe to open from Raycast keep their destination.
const LINK_SCHEMES = /^(https?:|mailto:)/i;

function markdownLink(href: string, innerHtml: string): string {
  const text = innerHtml.replace(/<[^>]+>/g, "").trim();
  const url = href.trim().replace(/&amp;/g, "&");
  if (!LINK_SCHEMES.test(url)) return text;
  if (!text || text === url) return url;
  const label = text.replace(/[[\]]/g, "\\$&");
  return `[${label}](${url.replace(/[ ()]/g, encodeURIComponent)})`;
}

/**
 * Outseta stores messages as HTML; Raycast renders markdown, so reduce them to text and keep links
 * as markdown links.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<a\s[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, _quote, href, inner) =>
      markdownLink(href, inner),
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date
    ? date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
}

// Markdown joins single newlines into one paragraph; chat transcripts depend on them.
function hardLineBreaks(text: string): string {
  return text.replace(/(?<!\n)\n(?!\n)/g, "  \n");
}

/** The case as a conversation: the opening message, then replies, notes and status changes in order. */
export function caseMarkdown(supportCase: Case): string {
  const customer = personName(supportCase.FromPerson);
  const parts = [
    `## ${caseTitle(supportCase)}`,
    `**${customer}** · ${formatDateTime(supportCase.SubmittedDateTime)}`,
    hardLineBreaks(htmlToText(supportCase.Body)) || "_No message._",
  ];

  const histories = [...(supportCase.CaseHistories ?? [])].sort((a, b) =>
    (a.HistoryDateTime ?? "").localeCompare(b.HistoryDateTime ?? ""),
  );
  for (const history of histories) {
    const when = formatDateTime(history.HistoryDateTime);
    const text = hardLineBreaks(htmlToText(history.Comment));
    switch (history.Type) {
      case CaseHistoryType.PersonReply:
        parts.push("---", `**${customer}** · ${when}`, text);
        break;
      case CaseHistoryType.AgentReply:
        parts.push("---", `**${history.AgentName || "Agent"}** · ${when}`, text);
        break;
      case CaseHistoryType.AutoReply:
        parts.push("---", `**${history.AgentName || "Auto-reply"}** · ${when}`, text);
        break;
      case CaseHistoryType.Note:
        parts.push("---", `📝 **Note by ${history.AgentName || "Agent"}** · ${when}`, text);
        break;
      default:
        if (text) parts.push(`_${text} · ${when}_`);
    }
  }
  return parts.join("\n\n");
}
