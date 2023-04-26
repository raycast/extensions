import {
  CreateDNSRecordRequest,
  EditDNSRecordByDomainSubdomainAndIdRequest,
  ErrorResponse,
  Preferences,
  DNSRecordType,
  RequestBody,
  Response,
} from "./types";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";

const API_KEY = getPreferenceValues<Preferences>().api_key;
const SECRET_API_KEY = getPreferenceValues<Preferences>().secret_api_key;
const API_URL = "https://porkbun.com/api/json/v3/";
const headers = {
  "Content-Type": "application/json",
};

const showError = (error: string) => {
  showToast({
    style: Toast.Style.Failure,
    title: "Porkbun Error",
    message: error,
  });
};
const callApi = async (endpoint: string, body?: RequestBody) => {
  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        apikey: API_KEY,
        secretapikey: SECRET_API_KEY,
        ...body,
      }),
    });

    const response = (await apiResponse.json()) as Response;
    if (!apiResponse.ok && response.status === "ERROR") {
      showError(response.message);
    }
    return response;
  } catch (error) {
    showError("Failed to execute request. Please try again later");
    return {
      status: "ERROR",
      message: "Failed to execute request. Please try again later",
    } as ErrorResponse;
  }
};

export async function ping() {
  return await callApi("ping");
}

export async function createRecord(domain: string, { ...params }: CreateDNSRecordRequest) {
  const body = { ...params };
  return await callApi(`dns/create/${domain}`, body);
}
export async function editRecordByDomainAndId(domain: string, id: number, { ...params }: CreateDNSRecordRequest) {
  const body = { ...params };
  return await callApi(`dns/edit/${domain}/${id}`, body);
}
export async function editRecordByDomainSubdomainAndType(
  domain: string,
  subdomain: string,
  type: DNSRecordType,
  { ...params }: EditDNSRecordByDomainSubdomainAndIdRequest
) {
  const body = { ...params };
  return await callApi(`dns/editByNameType/${domain}/${type}${subdomain && "/" + subdomain}`, body);
}
export async function deleteRecordByDomainAndId(domain: string, id: number) {
  return await callApi(`dns/delete/${domain}/${id}`);
}
export async function deleteRecordByDomainSubdomainAndType(domain: string, subdomain: string, type: DNSRecordType) {
  return await callApi(`dns/deleteByNameType/${domain}/${type}${subdomain && "/" + subdomain}`);
}
export async function retrieveRecordsByDomainOrId(domain: string, id: number) {
  return await callApi(`dns/retrieve/${domain}${id > 0 ? "/" + id : ""}`);
}
export async function retrieveRecordsByDomainSubdomainAndType(domain: string, subdomain: string, type: DNSRecordType) {
  return await callApi(`dns/retrieveByNameType/${domain}/${type}${subdomain && "/" + subdomain}`);
}

export async function retrieveSSLBundle(domain: string) {
  return await callApi(`ssl/retrieve/${domain}`);
}
