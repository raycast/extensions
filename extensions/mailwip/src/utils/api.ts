import {
  BodyRequest,
  ErrorResponse,
  Alias,
  AliasCreate,
  APIMethod,
  AliasCreateResponse,
  Email,
  DomainDelete,
} from "./types";
import { API_HEADERS, API_URL } from "./constants";

const callApi = async <T>(endpoint: string, method: APIMethod = "GET", body?: BodyRequest) => {
  const response = await fetch(API_URL + endpoint, {
    method,
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const contentType = response.headers.get("Content-Type");

    // 'application/json' returns empty whereas 'application/json; charset=utf-8' has json
    if (contentType === "text/html" || contentType === "application/json") throw response.statusText;

    const result = (await response.json()) as ErrorResponse;
    if ("errors" in result) throw Array.isArray(result.errors) ? result.errors.join(" | ") : result.errors;
    if ("message" in result) throw result.message;
    throw result.error;
  }
  const result = await response.json();
  return result as T;
};

// DOMAINS
export async function deleteDomains({ domains }: DomainDelete) {
  return await callApi<{ message: string }>(`domains/batch/`, "DELETE", { domains });
}

// ALIASES
export async function getDomainAliases(domain: string) {
  return await callApi<{ data: Alias[] }>(`domains/${domain}/aliases`);
}
export async function createDomainAlias(domain: string, newAlias: AliasCreate) {
  return await callApi<AliasCreateResponse>(`domains/${domain}/aliases`, "POST", newAlias);
}
export async function deleteDomainAlias(domain: string, alias: Alias) {
  return await callApi<{ data: { success: true } }>(`domains/${domain}/aliases/`, "DELETE", alias);
}
// EMAILS
export async function getEmails(domain: string, status: string, limit: string) {
  const searchParams = new URLSearchParams({ status, limit });
  if (domain !== "all") searchParams.append("domain", domain);
  const result = await callApi<{ data: Email[] }>(`mails?${searchParams}`);
  return result.data;
}
