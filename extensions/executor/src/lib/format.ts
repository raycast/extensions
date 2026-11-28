import { Color, Icon } from "@raycast/api";
import type { Connection, HealthStatus, SpecNumber } from "./types";

/** Narrows the spec's number-or-non-finite-string unions to a real number. */
export function toNumber(value: SpecNumber | null | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return undefined;
}

/**
 * Timestamps come back as epoch values. Values that look like seconds rather
 * than milliseconds are scaled up so both encodings render correctly.
 */
export function toDate(value: SpecNumber | null | undefined): Date | undefined {
  const numeric = toNumber(value);
  if (numeric === undefined) return undefined;
  const ms = numeric < 1e12 ? numeric * 1000 : numeric;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDate(value: SpecNumber | null | undefined): string {
  const date = toDate(value);
  return date ? date.toLocaleString() : "Unknown";
}

/** A compact relative age, e.g. `3d ago`. */
export function formatRelative(value: SpecNumber | null | undefined): string | undefined {
  const date = toDate(value);
  if (!date) return undefined;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);
  const [amount, unit] =
    abs < 60
      ? [abs, "s"]
      : abs < 3600
        ? [Math.round(abs / 60), "m"]
        : abs < 86400
          ? [Math.round(abs / 3600), "h"]
          : [Math.round(abs / 86400), "d"];
  return future ? `in ${amount}${unit}` : `${amount}${unit} ago`;
}

export const HEALTH_STATUSES: HealthStatus[] = ["healthy", "degraded", "expired", "misconfigured", "unknown"];

export function healthColor(status: HealthStatus | undefined): Color {
  switch (status) {
    case "healthy":
      return Color.Green;
    case "degraded":
      return Color.Orange;
    case "expired":
      return Color.Red;
    case "misconfigured":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function healthIcon(status: HealthStatus | undefined): { source: Icon; tintColor: Color } {
  const tintColor = healthColor(status);
  switch (status) {
    case "healthy":
      return { source: Icon.CheckCircle, tintColor };
    case "degraded":
      return { source: Icon.Warning, tintColor };
    case "expired":
      return { source: Icon.Clock, tintColor };
    case "misconfigured":
      return { source: Icon.XMarkCircle, tintColor };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor };
  }
}

/**
 * Words that stay fully capitalised when a slug is title cased, so an
 * identifier like `tool_id` renders as `Tool ID` rather than `Tool Id`.
 */
const ACRONYMS = new Set([
  "ai",
  "api",
  "aws",
  "cli",
  "crm",
  "csv",
  "gcp",
  "html",
  "http",
  "https",
  "id",
  "json",
  "mcp",
  "nsfw",
  "ocr",
  "pdf",
  "sdk",
  "sms",
  "sql",
  "ssh",
  "svg",
  "ui",
  "url",
  "uuid",
  "xml",
]);

/** Words whose correct form is neither lower, title, nor upper case. */
const MIXED_CASE: Record<string, string> = {
  graphql: "GraphQL",
  javascript: "JavaScript",
  oauth: "OAuth",
  openapi: "OpenAPI",
  typescript: "TypeScript",
  youtube: "YouTube",
};

/**
 * Brand names that title casing cannot derive from a slug. Executor
 * integration slugs are lowercase and underscore separated, so `github` has to
 * be mapped to `GitHub` rather than the `Github` a naive transform produces.
 */
const INTEGRATION_NAMES: Record<string, string> = {
  brandfetch: "Brandfetch",
  cloudflare: "Cloudflare",
  executor: "Executor",
  github: "GitHub",
  google_calendar: "Google Calendar",
  google_docs: "Google Docs",
  google_drive: "Google Drive",
  google_gmail: "Gmail",
  google_sheets: "Google Sheets",
  linear: "Linear",
  notion: "Notion",
  paypal: "PayPal",
  postman: "Postman",
  railway: "Railway",
  resend: "Resend",
  splitwise: "Splitwise",
  supabase: "Supabase",
  svgl: "SVGL",
  vercel: "Vercel",
  wise: "Wise",
  wispr_flow: "Wispr Flow",
  youtube: "YouTube",
};

/** Title cases a slug or status word, preserving known acronyms. */
export function titleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (MIXED_CASE[lower]) return MIXED_CASE[lower];
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

/**
 * Display name for an integration slug, e.g. `google_gmail` becomes `Gmail`.
 * Unknown slugs fall back to title casing, so a newly added integration still
 * reads correctly without a code change.
 */
export function integrationName(slug: string): string {
  return INTEGRATION_NAMES[slug.toLowerCase()] ?? titleCase(slug);
}

/** First sentence or line of a tool description, for list subtitles. */
export function summarize(description: string | null | undefined, max = 90): string {
  if (!description) return "";
  const flat = description
    .replace(/!?\[([^\]]+)\]\((?:[^()\s]|\([^()]*\))*(?:\s+"[^"]*")?\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function asJson(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Renders a value as a fenced markdown block, guarding against huge payloads. */
export function codeBlock(value: string, language = "json", maxLength = 20000): string {
  const text = value.length > maxLength ? `${value.slice(0, maxLength)}\n… truncated` : value;
  const fence = "`".repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1)));
  return [fence + language, text, fence].join("\n");
}

/** Display labels never replace the addresses sent to Executor. */
export function toolLabel(name: string): string {
  return titleCase(name.split(".").at(-1) ?? name);
}

export function schemaFields(value: unknown, depth = 0): string[] {
  if (!value || typeof value !== "object" || depth > 4) return [];
  const schema = value as Record<string, unknown>;
  if (!schema.properties || typeof schema.properties !== "object") return [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  return Object.entries(schema.properties).flatMap(([key, value]) => {
    const field = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const nested = schemaFields(field, depth + 1);
    const type = typeof field.type === "string" ? titleCase(field.type) : "See Technical Schema";
    const detail = typeof field.description === "string" ? `: ${summarize(field.description, 180)}` : "";
    return [
      `${"  ".repeat(depth)}- **${titleCase(key)}** (${type}, ${required.includes(key) ? "Required" : "Optional"})${detail}`,
      ...nested,
    ];
  });
}

/** Executor's saved display label wins; names are only the display fallback. */
export function connectionLabel(connection: Pick<Connection, "identityLabel" | "name">): string {
  return connection.identityLabel?.trim() || titleCase(connection.name);
}

export function connectionPresentation(
  target: Pick<Connection, "integration" | "owner" | "name">,
  connections: ReadonlyArray<Pick<Connection, "integration" | "owner" | "name" | "identityLabel">>,
): { text: string; tooltip: string } {
  const connection = connections.find(
    (candidate) =>
      candidate.integration === target.integration &&
      candidate.owner === target.owner &&
      candidate.name === target.name,
  );
  const identity = connection ? connectionLabel(connection) : titleCase(target.name);
  const scope = target.owner === "org" ? "Workspace" : "Personal";
  const duplicate = identity.localeCompare(scope, undefined, { sensitivity: "base" }) === 0;
  return {
    text: duplicate ? identity : `${identity} · ${scope}`,
    tooltip: `${scope} connection${duplicate ? "" : `: ${identity}`}`,
  };
}
