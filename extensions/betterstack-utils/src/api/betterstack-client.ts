import { getPreferenceValues } from "@raycast/api";
import { match } from "ts-pattern";
import { HttpMethods, HttpStatusCodes } from "@/common/utils/http-utils";
import { asOptional, Optional } from "@/common/utils/optional-utils";

export const BASE_URL = "https://uptime.betterstack.com";
export const V2_BASE = `${BASE_URL}/api/v2`;
export const V3_BASE = `${BASE_URL}/api/v3`;

interface RequestOptions {
  method?: typeof HttpMethods.GET | typeof HttpMethods.POST;
  body?: unknown;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination?: { next?: string | null };
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = HttpMethods.GET, body } = options;

  const response: Response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return match(response)
    .with({ ok: true }, (okResponse) => parseJson<T>(okResponse))
    .with({ status: HttpStatusCodes.UNAUTHORIZED }, invalidTokenError())
    .otherwise(apiError());
}

export async function fetchAllPages<T>(initialUrl: string): Promise<T[]> {
  let url: Optional<string> = initialUrl;
  const allItems: T[] = [];

  while (url) {
    const page: PaginatedResponse<T> = await request<PaginatedResponse<T>>(url);
    allItems.push(...page.data);
    url = asOptional(page.pagination?.next);
  }

  return allItems;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function invalidTokenError() {
  return () => {
    throw new Error("Invalid API token. Check your BetterStack API token in extension preferences.");
  };
}

function apiError() {
  return async (response: Response) => {
    const detail = await readErrorDetail(response);
    const suffix = detail ? ` — ${detail}` : "";

    throw new Error(`BetterStack API error: ${response.status} ${response.statusText}${suffix}`);
  };
}

async function readErrorDetail(response: Response): Promise<Optional<string>> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return asOptional(extractErrorMessage(JSON.parse(text))) ?? text;
  } catch {
    return text;
  }
}

function extractErrorMessage(body: unknown): Optional<string> {
  if (!body || typeof body !== "object" || !("errors" in body)) return undefined;

  const { errors } = body as { errors: unknown };

  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) return errors.map(String).join(", ");
  if (errors && typeof errors === "object") {
    return Object.entries(errors)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
      .join("; ");
  }

  return undefined;
}

function getHeaders(): Record<string, string> {
  const { apiToken } = getPreferenceValues<Preferences>();

  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}
