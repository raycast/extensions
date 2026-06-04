import { getPreferenceValues } from "@raycast/api";
import {
  SuccessResponse,
  ErrorResponse,
  Domain,
  DNSInfo,
  EmailAccount,
  CreateEmailAccountRequest,
  EmailForwarder,
  CreateEmailForwarderRequest,
  CatchAll,
  DomainVerificationKey,
} from "./types";

const { api_key, server, username } = getPreferenceValues<Preferences>();
const API_URL = "https://api.mxroute.com/";
const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const response = await fetch(API_URL + endpoint, {
    method: options?.method,
    headers: {
      "X-Api-Key": api_key,
      "X-Server": server,
      "X-Username": username,
      "Content-Type": "application/json",
    },
    body: options?.body,
  });
  if (response.headers.get("Content-Length") === "0") return undefined as T;
  const result = (await response.json()) as SuccessResponse<unknown> | ErrorResponse;
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

export const mxroute = {
  getDomainVerificationKey: () => makeRequest<DomainVerificationKey>("verification-key"),
  domains: {
    create: (domain: string) => makeRequest("domains", { method: "POST", body: JSON.stringify({ domain }) }),
    get: (domain: string) => makeRequest<Domain>(`domains/${domain}`),
    list: () => makeRequest<string[]>("domains"),
    setMailHostingStatus: (domain: string, values: { enabled: boolean }) =>
      makeRequest<{ domain: string; mail_hosting: boolean }>(`domains/${domain}/mail-status`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    accounts: {
      create: (domain: string, values: CreateEmailAccountRequest) =>
        makeRequest(`domains/${domain}/email-accounts`, { method: "POST", body: JSON.stringify(values) }),
      delete: (domain: string, username: string) =>
        makeRequest(`domains/${domain}/email-accounts/${username}`, { method: "DELETE" }),
      list: (domain: string) => makeRequest<EmailAccount[]>(`domains/${domain}/email-accounts`),
    },
    catchAll: {
      get: (domain: string) => makeRequest<CatchAll>(`domains/${domain}/catch-all`),
      set: (domain: string, values: { type: string; address?: string }) =>
        makeRequest(`domains/${domain}/catch-all`, { method: "POST", body: JSON.stringify(values) }),
    },
    dns: {
      get: (domain: string) => makeRequest<DNSInfo>(`domains/${domain}/dns`),
    },
    forwarders: {
      create: (domain: string, values: CreateEmailForwarderRequest) =>
        makeRequest(`domains/${domain}/forwarders`, { method: "POST", body: JSON.stringify(values) }),
      delete: (domain: string, alias: string) =>
        makeRequest(`domains/${domain}/forwarders/${alias}`, { method: "DELETE" }),
      list: (domain: string) => makeRequest<EmailForwarder[]>(`domains/${domain}/forwarders`),
    },
  },
};
