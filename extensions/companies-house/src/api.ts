import { getPreferenceValues } from "@raycast/api";

import { API_BASE, DOCUMENT_API_BASE, PAGE_SIZE } from "./constants";
import type {
  AppointmentsResponse,
  ChargesResponse,
  CompanyOfficersResponse,
  CompanyProfile,
  CompanySearchResponse,
  DisqualifiedOfficer,
  DisqualifiedOfficerSearchResponse,
  DocumentMetadata,
  ExemptionsResponse,
  FilingHistoryResponse,
  InsolvencyResponse,
  OfficerSearchResponse,
  PscResponse,
  PscStatementsResponse,
} from "./types";

type QueryParams = Record<string, string | number | undefined>;

/**
 * Companies House company numbers are eight characters and the API matches
 * them exactly: `/company/445790` and `/company/oc394454` both 404, while
 * `/company/00445790` and `/company/OC394454` both succeed. People type the
 * short form constantly, and an AI model asked to look up "company 445790"
 * would otherwise be told the company does not exist.
 */
export function normalizeCompanyNumber(companyNumber: string): string {
  const trimmed = companyNumber.trim().toUpperCase().replace(/\s+/g, "");
  return /^\d+$/.test(trimmed) ? trimmed.padStart(8, "0") : trimmed;
}

function companyPath(companyNumber: string, suffix = ""): string {
  return `/company/${encodeURIComponent(normalizeCompanyNumber(companyNumber))}${suffix}`;
}

/** Turns an HTTP status into a clear, actionable message. */
function messageForStatus(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "Invalid or unauthorized API key. Check it in the extension preferences.";
    case 404:
      return "Not found.";
    case 410:
      return "Companies House no longer holds this document.";
    case 416:
      return "Companies House does not serve search results beyond the first 1,000. Narrow the search.";
    case 429:
      return "Rate limit reached (600 requests per 5 minutes). Please wait a moment and try again.";
    default:
      if (status >= 500) {
        return "Companies House is currently unavailable. Please try again later.";
      }
      return `Request failed (${status}).`;
  }
}

function buildUrl(base: string, path: string, params?: QueryParams): URL {
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

/**
 * Authentication is HTTP Basic with the API key as the username and an empty
 * password, so the header is `Basic base64("<key>:")`.
 */
function authHeader(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

/** Performs an authenticated GET against the Companies House API. */
async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(buildUrl(API_BASE, path, params), {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });

  if (!response.ok) {
    throw new NotOkError(response.status);
  }

  return (await response.json()) as T;
}

/** Carries the HTTP status so callers can tell an absence from a failure. */
class NotOkError extends Error {
  constructor(readonly status: number) {
    super(messageForStatus(status));
    this.name = "NotOkError";
  }
}

/**
 * For sub-resources a company may legitimately not have.
 *
 * Companies House answers "this company has no charges" and "this company has
 * no insolvency history" with a 404, the same status it uses for a company
 * number that does not exist. Treating that as an error shows a failure toast
 * to someone whose only crime was looking up a company with a clean record, so
 * these endpoints resolve to `undefined` instead and let the view say "none".
 */
async function requestOptional<T>(
  path: string,
  params?: QueryParams,
): Promise<T | undefined> {
  try {
    return await request<T>(path, params);
  } catch (error) {
    if (error instanceof NotOkError && error.status === 404) return undefined;
    throw error;
  }
}

export function searchCompanies(query: string, startIndex: number) {
  return request<CompanySearchResponse>("/search/companies", {
    q: query,
    items_per_page: PAGE_SIZE,
    start_index: startIndex,
  });
}

export function searchOfficers(query: string, startIndex: number) {
  return request<OfficerSearchResponse>("/search/officers", {
    q: query,
    items_per_page: PAGE_SIZE,
    start_index: startIndex,
  });
}

export function getCompany(companyNumber: string) {
  return request<CompanyProfile>(companyPath(companyNumber));
}

export function getCompanyOfficers(companyNumber: string, startIndex: number) {
  return request<CompanyOfficersResponse>(
    companyPath(companyNumber, "/officers"),
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getOfficerAppointments(officerId: string, startIndex: number) {
  return request<AppointmentsResponse>(
    `/officers/${encodeURIComponent(officerId)}/appointments`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getFilingHistory(companyNumber: string, startIndex: number) {
  return request<FilingHistoryResponse>(
    companyPath(companyNumber, "/filing-history"),
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

/**
 * A company with no charges 404s rather than returning an empty list, so this
 * resolves to `undefined` in that case rather than throwing.
 */
export function getCharges(companyNumber: string, startIndex: number) {
  return requestOptional<ChargesResponse>(
    companyPath(companyNumber, "/charges"),
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getPersonsWithSignificantControl(
  companyNumber: string,
  startIndex: number,
) {
  return request<PscResponse>(
    companyPath(companyNumber, "/persons-with-significant-control"),
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

/**
 * Statements filed in place of a PSC entry. A company that has never filed one
 * 404s, so this resolves to `undefined` rather than throwing.
 */
export function getPscStatements(companyNumber: string, startIndex: number) {
  return requestOptional<PscStatementsResponse>(
    companyPath(companyNumber, "/persons-with-significant-control-statements"),
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

/**
 * PSC exemptions. Almost every company has none and 404s, so this resolves to
 * `undefined` rather than throwing.
 */
export function getExemptions(companyNumber: string) {
  return requestOptional<ExemptionsResponse>(
    companyPath(companyNumber, "/exemptions"),
  );
}

/**
 * The insolvency record. A company that has never been subject to insolvency
 * proceedings 404s, so this resolves to `undefined` rather than throwing.
 */
export function getInsolvency(companyNumber: string) {
  return requestOptional<InsolvencyResponse>(
    companyPath(companyNumber, "/insolvency"),
  );
}

/**
 * Searches the register of disqualified directors.
 *
 * This register keys officers by its own ids, which are not the ids used by
 * `/officers/{id}/appointments`, so a name search is the only bridge from an
 * officer in a company's records to a disqualification record.
 */
export function searchDisqualifiedOfficers(query: string, startIndex: number) {
  return request<DisqualifiedOfficerSearchResponse>(
    "/search/disqualified-officers",
    {
      q: query,
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

/**
 * Reads one disqualification record. `register` comes from the search result's
 * `links.self`; the two registers are separate resources and an id from one is
 * not valid in the other.
 */
export function getDisqualifiedOfficer(
  register: DisqualificationRegister,
  officerId: string,
) {
  return requestOptional<DisqualifiedOfficer>(
    `/disqualified-officers/${register}/${encodeURIComponent(officerId)}`,
  );
}

export type DisqualificationRegister = "natural" | "corporate";

/** Splits `/disqualified-officers/natural/{id}` into its register and id. */
export function parseDisqualificationLink(
  link?: string,
): { register: DisqualificationRegister; officerId: string } | undefined {
  const match = link?.match(
    /disqualified-officers\/(natural|corporate)\/([^/?#]+)/,
  );
  if (!match) return undefined;
  return {
    register: match[1] as DisqualificationRegister,
    officerId: match[2],
  };
}

// --- Filed documents ------------------------------------------------------

/**
 * Accepts a raw document id or the full `links.document_metadata` URL that
 * filing history items carry.
 */
export function documentIdFromLink(link: string): string {
  const trimmed = link
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/content$/, "");
  const marker = "/document/";
  const index = trimmed.lastIndexOf(marker);
  return index >= 0 ? trimmed.slice(index + marker.length) : trimmed;
}

export async function getDocumentMetadata(documentId: string) {
  const response = await fetch(
    buildUrl(DOCUMENT_API_BASE, `/document/${encodeURIComponent(documentId)}`),
    { headers: { Authorization: authHeader(), Accept: "application/json" } },
  );
  if (!response.ok) throw new NotOkError(response.status);
  return (await response.json()) as DocumentMetadata;
}

/**
 * Hosts the content redirect is allowed to point at.
 *
 * Companies House hands out a signed URL on its own S3 bucket. Following an
 * arbitrary `Location` would let a misbehaving upstream steer the download at
 * any address it liked and hand the response back as a filed document.
 */
/**
 * Each entry is a dotted suffix. The leading dot matters: without it,
 * `endsWith` would also accept `evils3.eu-west-2.amazonaws.com`. The exact
 * comparison below covers the apex host itself.
 */
const ALLOWED_DOCUMENT_HOSTS = [
  ".company-information.service.gov.uk",
  ".s3.eu-west-2.amazonaws.com",
];

function allowedDocumentUrl(location: string, base: string): URL | undefined {
  let url: URL;
  try {
    url = new URL(location, base);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:") return undefined;
  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_DOCUMENT_HOSTS.some(
    (suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix),
  );
  return allowed ? url : undefined;
}

/** Redirect hops to follow before giving up. One is what the API needs. */
const MAX_DOCUMENT_REDIRECTS = 3;

/**
 * Fetches a filed document.
 *
 * `GET /document/{id}/content` answers with a 302 to a short-lived signed URL.
 * Every hop is followed by hand so that each `Location` is checked; handing the
 * chain to `fetch` would check the first one and then follow wherever it led.
 * The hops after the first are deliberately unauthenticated: the signed URL
 * carries its own credentials, S3 rejects a request presenting two, and the
 * Companies House key has no business being sent to a third-party host.
 */
export async function fetchDocumentContent(
  documentId: string,
  accept: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const contentUrl = `${DOCUMENT_API_BASE}/document/${encodeURIComponent(documentId)}/content`;
  let response = await fetch(contentUrl, {
    headers: { Authorization: authHeader(), Accept: accept },
    redirect: "manual",
  });
  let currentUrl = contentUrl;

  for (let hop = 0; response.status >= 300 && response.status < 400; hop++) {
    const location = response.headers.get("location");
    const target = location
      ? allowedDocumentUrl(location, currentUrl)
      : undefined;
    if (hop >= MAX_DOCUMENT_REDIRECTS || !target) {
      throw new Error(
        "Companies House redirected the document somewhere unexpected, so it was not downloaded.",
      );
    }
    response = await fetch(target, { redirect: "manual" });
    currentUrl = target.toString();
  }

  if (!response.ok) throw new NotOkError(response.status);

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type")?.split(";")[0]?.trim() || accept,
  };
}
