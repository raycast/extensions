import { getPreferenceValues } from "@raycast/api";
import {
  ErrorResponse,
  GetDNSRecordsResponse,
  GetDomainsResponse,
  GetEmailAddressesRequest,
  GetEmailAddressesResponse,
  PostDomainsRequest,
  PostEmailAddressesRequest,
  PostEmailsRequest,
} from "./types";

const { api_key } = getPreferenceValues<Preferences>();
export const APP_URL = "https://inbound.new";
const API_URL = APP_URL + "/api/v2/";
const API_HEADERS = {
  Authorization: `Bearer ${api_key}`,
  "Content-Type": "application/json",
};
export const LIMIT = 25;

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers: API_HEADERS,
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result as ErrorResponse).error);
  return result as T;
};
export const inbound = {
  domain: {
    list: () => makeRequest<GetDomainsResponse>("domains"),
    create: (params: PostDomainsRequest) =>
      makeRequest("domains", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    delete: (id: string) =>
      makeRequest(`domains/${id}`, {
        method: "DELETE",
      }),
    getDnsRecords: (id: string) => makeRequest<GetDNSRecordsResponse>(`domains/${id}/dns-records`),
  },
  email: {
    address: {
      list: (params: GetEmailAddressesRequest) =>
        makeRequest<GetEmailAddressesResponse>(`email-addresses?domainId=${params.domainId}`),
      create: (params: PostEmailAddressesRequest) =>
        makeRequest("email-addresses", {
          method: "POST",
          body: JSON.stringify(params),
        }),
      delete: (id: string) =>
        makeRequest(`email-addresses/${id}`, {
          method: "DELETE",
        }),
    },
    send: (params: PostEmailsRequest) => makeRequest("emails", {
        method: "POST",
        body: JSON.stringify(params)
    })
  }
};
