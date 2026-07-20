import { Icon, Color } from "@raycast/api";

/** Replace pipe characters with a Unicode box-drawing character to avoid breaking markdown tables. */
export function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\u2502");
}

/** Parse an Auth0 tenant domain into its slug and region. */
export function parseTenantDomain(domain: string): { tenantSlug: string; region: string } {
  const parts = domain.split(".");
  return {
    tenantSlug: parts[0],
    region: parts.length >= 4 ? parts[1] : "us",
  };
}

/** Build the Auth0 dashboard URL for a specific user. */
export function buildUserDashboardUrl(domain: string, userId: string): string {
  const { tenantSlug, region } = parseTenantDomain(domain);
  return `https://manage.auth0.com/dashboard/${region}/${tenantSlug}/users/${Buffer.from(encodeURIComponent(userId)).toString("base64")}`;
}

/** Map of Auth0 log event type codes to display metadata. */
const LOG_TYPE_MAP: Record<string, { label: string; icon: Icon; color: Color }> = {
  s: { label: "Success Login", icon: Icon.CheckCircle, color: Color.Green },
  ss: { label: "Success Signup", icon: Icon.AddPerson, color: Color.Green },
  f: { label: "Failed Login", icon: Icon.XMarkCircle, color: Color.Red },
  fp: { label: "Failed Login (Wrong Password)", icon: Icon.XMarkCircle, color: Color.Red },
  fs: { label: "Failed Signup", icon: Icon.XMarkCircle, color: Color.Red },
  fu: { label: "Failed Login (Invalid Email)", icon: Icon.XMarkCircle, color: Color.Red },
  fc: { label: "Failed by Connector", icon: Icon.XMarkCircle, color: Color.Red },
  fco: { label: "Failed by CORS", icon: Icon.XMarkCircle, color: Color.Red },
  seacft: { label: "Success Exchange (Auth Code)", icon: Icon.CheckCircle, color: Color.Green },
  feacft: { label: "Failed Exchange (Auth Code)", icon: Icon.XMarkCircle, color: Color.Red },
  seccft: { label: "Success Exchange (Client Credentials)", icon: Icon.CheckCircle, color: Color.Green },
  feccft: { label: "Failed Exchange (Client Credentials)", icon: Icon.XMarkCircle, color: Color.Red },
  du: { label: "Deleted User", icon: Icon.Trash, color: Color.Orange },
  sv: { label: "Success Verification Email", icon: Icon.Envelope, color: Color.Green },
  fv: { label: "Failed Verification Email", icon: Icon.Envelope, color: Color.Red },
  scp: { label: "Success Change Password", icon: Icon.Key, color: Color.Green },
  fcp: { label: "Failed Change Password", icon: Icon.Key, color: Color.Red },
  sce: { label: "Success Change Email", icon: Icon.Envelope, color: Color.Green },
  fce: { label: "Failed Change Email", icon: Icon.Envelope, color: Color.Red },
  sapi: { label: "Success API Operation", icon: Icon.Globe, color: Color.Green },
  fapi: { label: "Failed API Operation", icon: Icon.Globe, color: Color.Red },
  limit_wc: { label: "Blocked Account", icon: Icon.Lock, color: Color.Red },
  limit_ui: { label: "Too Many Logins", icon: Icon.Lock, color: Color.Orange },
  gd_otp_rate_limit_exceed: { label: "OTP Rate Limit", icon: Icon.Lock, color: Color.Orange },
};

/** Map a log event type code to its display label, icon, and color. Falls back to a generic style. */
export function getLogTypeInfo(type?: string) {
  if (!type) return { label: "Unknown", icon: Icon.QuestionMark, color: Color.SecondaryText };
  return LOG_TYPE_MAP[type] || { label: type, icon: Icon.Dot, color: Color.SecondaryText };
}

/** Format an ISO date string as a human-readable relative time (e.g. "5m ago", "2d ago"). */
export function formatRelativeDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Format an ISO date string as a localized date (date-only), or a fallback string if absent. */
export function formatDate(dateString?: string, fallback = "Never"): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleDateString();
}

/** Format an ISO date string as a localized date+time, or a fallback string if absent. */
export function formatDateTime(dateString?: string, fallback = "\u2014"): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleString();
}

/**
 * Build a concise label for the active date filter to display in the navigation title.
 * Returns undefined when no filter is active. Detects presets, exact-date, and custom ranges.
 */
export function formatFilterLabel(dateFrom: Date | null, dateTo: Date | null): string | undefined {
  if (!dateFrom && !dateTo) return undefined;

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (dateFrom && !dateTo) {
    const now = Date.now();
    const diffMs = now - dateFrom.getTime();
    const diffHours = diffMs / 3_600_000;
    if (diffHours < 1.5) {
      const mins = Math.round(diffMs / 60_000);
      return mins <= 60 ? "Last Hour" : `Last ${mins}m`;
    }
    if (diffHours < 48) {
      const h = Math.round(diffHours);
      return h === 24 ? "Last 24h" : `Last ${h}h`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays <= 31) return diffDays === 7 ? "Last 7 Days" : diffDays === 30 ? "Last 30 Days" : `Last ${diffDays}d`;
    return `From ${fmt(dateFrom)}`;
  }
  if (!dateFrom && dateTo) return `Until ${fmt(dateTo)}`;

  if (
    dateFrom &&
    dateTo &&
    dateFrom.getHours() === 0 &&
    dateFrom.getMinutes() === 0 &&
    dateTo.getHours() === 23 &&
    dateTo.getMinutes() === 59 &&
    dateFrom.toDateString() === dateTo.toDateString()
  ) {
    return dateFrom.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return `${fmt(dateFrom!)} \u2013 ${fmt(dateTo!)}`;
}

/** Human-readable labels for Auth0 application types. */
export const APP_TYPE_LABELS: Record<string, string> = {
  non_interactive: "Machine to Machine",
  spa: "Single Page App",
  regular_web: "Regular Web App",
  native: "Native",
};
