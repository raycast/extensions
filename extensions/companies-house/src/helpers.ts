import { Color, environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { WEB_BASE } from "./constants";
import type { Address, DateOfBirth, FilingItem } from "./types";

// --- Bundled Companies House enumerations ----------------------------------

interface Enumerations {
  filing_descriptions: Record<string, string>;
  company_type: Record<string, string>;
  company_status: Record<string, string>;
  company_status_detail: Record<string, string>;
  officer_role: Record<string, string>;
  sic_descriptions: Record<string, string>;
  register_types: Record<string, string>;
  cessation_label_for_status: Record<string, string>;
  psc_descriptions: Record<string, string>;
  psc_short_descriptions: Record<string, string>;
  psc_statement_descriptions: Record<string, string>;
  exemption_descriptions: Record<string, string>;
  insolvency_case_types: Record<string, string>;
  insolvency_case_date_types: Record<string, string>;
  disqualification_reasons: Record<string, string>;
  disqualification_acts: Record<string, string>;
  disqualification_types: Record<string, string>;
}

let cachedEnums: Enumerations | undefined;

/**
 * Loads the bundled enumerations (filing descriptions, company types, statuses,
 * officer roles, SIC descriptions) from the assets folder, once per session.
 */
function enums(): Enumerations {
  if (!cachedEnums) {
    const raw = readFileSync(
      join(environment.assetsPath, "enumerations.json"),
      "utf8",
    );
    cachedEnums = JSON.parse(raw) as Enumerations;
  }
  return cachedEnums;
}

// --- Generic text helpers -------------------------------------------------

/** Turns a hyphen/underscore code into a sentence-cased label as a fallback. */
function humanize(code: string): string {
  const text = code.replace(/[-_]/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : code;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

// --- Dates ----------------------------------------------------------------

/**
 * Formats an ISO date as e.g. "7 Jun 2026"; returns the input unchanged if
 * unparseable.
 *
 * Companies House dates are calendar dates, not instants: "2026-02-28" is the
 * day a document was filed, wherever the reader happens to be. `new Date()`
 * parses a date-only string as UTC midnight, so formatting it in the local zone
 * shows the previous day to anyone west of UTC. Formatting in UTC keeps the
 * date the register actually recorded.
 *
 * A few endpoints send the same calendar date as a timestamp with no offset —
 * the disqualified-officers search returns "1987-10-18T00:00:00". JavaScript
 * reads that form as *local* midnight, which then formats in UTC as the day
 * before for anyone east of UTC. Trimming to the date part first means the two
 * shapes produce the same day, which is what the register recorded.
 */
export function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const calendarDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value;
  const date = new Date(calendarDate);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats the end of a disqualification.
 *
 * A sanctions disqualification records "9999-12-31", which is the register's
 * way of saying there is no end date rather than a date in the year 9999.
 */
export function disqualificationEndLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith("9999") ? "No end date recorded" : formatDate(value);
}

/** Formats an officer's date of birth as "March 1980" (month and year only). */
export function formatDateOfBirth(dob?: DateOfBirth): string | undefined {
  if (!dob?.month || !dob?.year) return undefined;
  const month = new Date(
    Date.UTC(dob.year, dob.month - 1, 1),
  ).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${month} ${dob.year}`;
}

// --- Addresses ------------------------------------------------------------

/** Joins the parts of an address into a single readable line. */
export function formatAddress(address?: Address): string | undefined {
  if (!address) return undefined;
  const line1 = [address.premises, address.address_line_1]
    .filter(Boolean)
    .join(" ");
  const parts = [
    line1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : undefined;
}

// --- Enumerated labels ----------------------------------------------------

export function companyStatusLabel(status?: string): string | undefined {
  if (!status) return undefined;
  return enums().company_status[status] ?? humanize(status);
}

export function companyStatusDetailLabel(detail?: string): string | undefined {
  if (!detail) return undefined;
  return enums().company_status_detail[detail] ?? humanize(detail);
}

export function companyTypeLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return enums().company_type[type] ?? humanize(type);
}

export function officerRoleLabel(role?: string): string | undefined {
  if (!role) return undefined;
  return enums().officer_role[role] ?? humanize(role);
}

/** A concise label for a PSC nature-of-control code, e.g. "Ownership of shares – 75% or more". */
export function pscNatureLabel(code: string): string {
  return (
    enums().psc_short_descriptions[code] ??
    enums().psc_descriptions[code] ??
    humanize(code)
  );
}

/** Turns a PSC kind into a readable label, e.g. "Individual", "Corporate entity". */
export function pscKindLabel(kind?: string): string | undefined {
  if (!kind) return undefined;
  const cleaned = kind
    .replace(/-person-with-significant-control$/, "")
    .replace(/-beneficial-owner$/, "");
  return humanize(cleaned);
}

/**
 * The full text of a statement filed in place of a PSC entry.
 *
 * The register's own identifier for the commonest statement contains a
 * long-standing spelling mistake ("signficant"), so these are looked up rather
 * than derived from the code.
 */
export function pscStatementLabel(statement?: string): string | undefined {
  if (!statement) return undefined;
  return enums().psc_statement_descriptions[statement] ?? humanize(statement);
}

/** The full text Companies House publishes for a PSC exemption type. */
export function exemptionLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return enums().exemption_descriptions[type] ?? humanize(type);
}

/** A readable name for an insolvency case type, e.g. "Compulsory liquidation". */
export function insolvencyCaseTypeLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return enums().insolvency_case_types[type] ?? humanize(type);
}

/** A readable name for an insolvency case date, e.g. "Commencement of winding up". */
export function insolvencyDateTypeLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return enums().insolvency_case_date_types[type] ?? humanize(type);
}

/** The statutory reason for a disqualification, from its `description_identifier`. */
export function disqualificationReasonLabel(
  identifier?: string,
): string | undefined {
  if (!identifier) return undefined;
  return enums().disqualification_reasons[identifier] ?? humanize(identifier);
}

/** The Act a disqualification was made under. */
export function disqualificationActLabel(act?: string): string | undefined {
  if (!act) return undefined;
  return enums().disqualification_acts[act] ?? humanize(act);
}

/** How the disqualification arose: a court order, an undertaking, or a sanction. */
export function disqualificationTypeLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return enums().disqualification_types[type] ?? humanize(type);
}

/** Renders a SIC code with its description, e.g. "62012 — Business and domestic software development". */
export function sicCodeLabel(code: string): string {
  const description = enums().sic_descriptions[code];
  return description ? `${code} — ${description}` : code;
}

const JURISDICTIONS: Record<string, string> = {
  "england-wales": "England & Wales",
  wales: "Wales",
  england: "England",
  scotland: "Scotland",
  "northern-ireland": "Northern Ireland",
  "united-kingdom": "United Kingdom",
  "european-union": "European Union",
  "england-wales-scotland": "England, Wales & Scotland",
  "non-eu": "Non-EU",
};

export function jurisdictionLabel(jurisdiction?: string): string | undefined {
  if (!jurisdiction) return undefined;
  return JURISDICTIONS[jurisdiction] ?? humanize(jurisdiction);
}

/** A color for a company status tag — green for live, red for closed, orange for distress. */
export function statusColor(status?: string): Color {
  switch (status) {
    case "active":
    case "registered":
    case "open":
      return Color.Green;
    case "dissolved":
    case "removed":
    case "closed":
    case "converted-closed":
      return Color.Red;
    case "liquidation":
    case "receivership":
    case "administration":
    case "in-administration":
    case "insolvency-proceedings":
    case "voluntary-arrangement":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

// --- Filing history descriptions ------------------------------------------

function substitute(
  template: string,
  values?: Record<string, unknown>,
): string {
  return template
    .replace(/\{([^}]+)\}/g, (_, key: string) => {
      const value = values?.[key];
      if (value === undefined || value === null) return "";
      if (typeof value !== "string" && typeof value !== "number") return "";
      const text = String(value);
      return typeof value === "string" && isIsoDate(text)
        ? (formatDate(text) ?? text)
        : text;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function buildFilingDescription(item: FilingItem): string {
  const code = item.description;
  if (!code) return "Filing";
  if (code === "legacy" || code === "legacy-document") {
    const legacy = item.description_values?.description;
    return typeof legacy === "string" && legacy.trim()
      ? legacy
      : "Legacy document";
  }
  const template = enums().filing_descriptions[code];
  return template
    ? substitute(template, item.description_values)
    : humanize(code);
}

/** Plain-text filing description for list titles (markdown emphasis stripped). */
export function filingDescription(item: FilingItem): string {
  return buildFilingDescription(item).replace(/\*\*/g, "");
}

/** Filing description preserving `**bold**` emphasis, for markdown detail views. */
export function filingDescriptionMarkdown(item: FilingItem): string {
  return buildFilingDescription(item);
}

export function filingCategoryLabel(category?: string): string | undefined {
  if (!category) return undefined;
  return humanize(category);
}

// --- Links ----------------------------------------------------------------

export function companyWebUrl(companyNumber: string): string {
  return `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}`;
}

export function officerWebUrl(officerId: string): string {
  return `${WEB_BASE}/officers/${encodeURIComponent(officerId)}/appointments`;
}

export function disqualifiedOfficerWebUrl(
  register: "natural" | "corporate",
  officerId: string,
): string {
  return `${WEB_BASE}/disqualified-officers/${register}/${encodeURIComponent(officerId)}`;
}

/**
 * The public viewer for a filed document. It needs no API key, which is why it
 * is the browser action: the Document API's own content URL is authenticated
 * and would only give a browser a 401.
 */
export function filingDocumentWebUrl(
  companyNumber: string,
  transactionId: string,
): string {
  return `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/filing-history/${encodeURIComponent(transactionId)}/document?format=pdf&download=0`;
}

/** Extracts the officer id from a Companies House link such as `/officers/{id}/appointments`. */
export function extractOfficerId(link?: string): string | undefined {
  if (!link) return undefined;
  return link.match(/officers\/([^/]+)/)?.[1];
}
