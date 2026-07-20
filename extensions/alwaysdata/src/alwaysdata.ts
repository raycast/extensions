import { getPreferenceValues } from "@raycast/api";
import { DNSRecord, DNSRecordForm, Domain, ErrorResult, Mailbox, Site, Token } from "./types";

const { api_token } = getPreferenceValues<Preferences>();
const API_URL = "https://api.alwaysdata.com/v1";
// we have this slightly complex func since trailing slash is required
const buildApiUrl = (endpoint: string, params?: { [key: string]: string | number }) =>
  `${API_URL}/${endpoint}/${
    params
      ? `?${Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&")}`
      : ""
  }`;
const headers = {
  "Accept-Language": "en",
  Authorization: `Basic ${Buffer.from(`${api_token}:`).toString("base64")}`,
};
export const makeRequest = async <T>(
  endpoint: string,
  options?: RequestInit & { params?: { [key: string]: string | number } },
) => {
  const response = await fetch(buildApiUrl(endpoint, options?.params), {
    ...options,
    headers,
  });
  if (response.status === 201 || response.status === 204) return undefined as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(typeof err === "string" ? err : `${Object.keys(err)[0]}: ${err[Object.keys(err)[0]]}`);
  }
  return result as T;
};

export const alwaysdata = {
  domains: {
    add: (props: { name: string }) => makeRequest<void>("domain", { method: "POST", body: JSON.stringify(props) }),
    delete: (props: { id: number }) => makeRequest<void>(`domain/${props.id}`, { method: "DELETE" }),
    list: () => makeRequest<Domain[]>("domain"),
  },
  dnsRecords: {
    add: (props: DNSRecordForm) => makeRequest<void>("record", { method: "POST", body: JSON.stringify(props) }),
    delete: (props: { id: number }) => makeRequest<void>(`record/${props.id}`, { method: "DELETE" }),
    list: (props: { domainId: number }) => makeRequest<DNSRecord[]>("record", { params: { domain: props.domainId } }),
  },
  emails: {
    list: () => makeRequest<Mailbox[]>("mailbox"),
  },
  sites: {
    list: () => makeRequest<Site[]>("site"),
  },
  tokens: {
    delete: (props: { id: number }) => makeRequest<void>(`token/${props.id}`, { method: "DELETE" }),
    list: () => makeRequest<Token[]>("token"),
  },
};
