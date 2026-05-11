import { getPreferenceValues } from "@raycast/api";
import { Contact, DomainAvailability, OrderDomain } from "./types";

const { api_key } = getPreferenceValues<ExtensionPreferences>();
const API_URL = "https://api.nicnames.com/2/";
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-api-key": api_key,
};
export const callApi = async <T>(endpoint: string, options?: { method: string; payload: Record<string, string[]> }) => {
  const response = await fetch(API_URL + endpoint, {
    method: options?.method,
    headers: API_HEADERS,
    body: options?.payload ? JSON.stringify(options.payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result as T;
};

export const checkDomainAvailability = (domain: string) => callApi<DomainAvailability>(`domain/${domain}/check`);
export const listContacts = () => callApi<{ list: Contact[] }>("contact");
export const listDomains = () => callApi<{ list: OrderDomain[] }>("domain");
export const updateDomainNameServers = (domain: string, ns: string[]) =>
  callApi<{ jobId: string } | OrderDomain>(`domain/${domain}/update/ns`, { method: "PATCH", payload: { ns } });
