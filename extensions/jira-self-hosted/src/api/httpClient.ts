import { getPreferenceValues } from "@raycast/api";
import { fetch as undiciFetch, Agent, type RequestInit } from "undici";

const insecureDispatcher = (() => {
  const { insecureSSL } = getPreferenceValues<{ insecureSSL: boolean }>();
  return insecureSSL ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;
})();

export async function jiraFetch(input: string | URL, init?: RequestInit) {
  const response = await undiciFetch(input, {
    ...init,
    ...(insecureDispatcher ? { dispatcher: insecureDispatcher } : {}),
  });
  if (!response.ok) {
    const url = typeof input === "string" ? input : input.href;
    const method = (init?.method ?? "GET").toString().toUpperCase();
    console.warn(`Jira HTTP ${response.status} ${response.statusText}: ${method} ${url}`);
  }
  return response;
}

export type { RequestInit } from "undici";
