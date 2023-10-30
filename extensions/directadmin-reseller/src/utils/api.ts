import { Toast, showToast } from "@raycast/api";
import {
  CreateDatabaseRequest,
  CreateNewDomainRequest,
  CreateSubdomainRequest,
  DeleteDatabaseRequest,
  DeleteSubdomainRequest,
  ErrorResponse
} from "../types";
import fetch, { Response } from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";
import { showFailureToast } from "@raycast/utils";

const callApi = async (endpoint: string, animatedToastMessage = "", body?) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  let apiResponse;
  if (!body)
    apiResponse = await fetch(API_URL + "CMD_API_" + endpoint, { headers: API_HEADERS, method: "POST" });
  else
    apiResponse = await fetch(API_URL + "CMD_API_" + endpoint, { headers: API_HEADERS, method: "POST", body: JSON.stringify(body) });
  // const apiResponse = await fetch(API_URL + "CMD_API_" + endpoint, { headers: API_HEADERS, method: "POST" });
  if (!apiResponse.ok) {
    return returnApiResponseAsError(apiResponse);
  } else {
    const apiResponseContentType = apiResponse.headers.get('Content-Type');
    if (apiResponseContentType?.includes("text/html")) {
        const text = "DirectAdmin Error";
        await showFailureToast(text);
        const errorResponse = {
          error: "1",
          text,
          details: ""
      } as ErrorResponse;
      return errorResponse;
    }
    const response = await apiResponse.text();
    
    const urlSearchParams = new URLSearchParams(response);
    const params = {} as { [key: string]: string | string[] };
    urlSearchParams.forEach((value, key) => {
      if (urlSearchParams.getAll(key).length > 1 || key.includes("[]")) {
        key = key.replace("[]", ""); // Remove square brackets
        params[key] = params[key] || [];
        params[key].push(value);
      } else {
        params[key] = value;
      }    
    });

    // Since some endpoints return an error=0 whereas others return no error,
    //  we will add an "error=0" to make error-checking easier
    if (!("error" in params)) params.error = "0";
    return params;
  }
};

async function returnApiResponseAsError(apiResponse: Response) {
    const response = new URLSearchParams(await apiResponse.text());
    const text = response.get('text') as string;
    const details = response.get('details') as string;
    const errorResponse = {
        error: "1",
        text: text,
        details: details
    } as ErrorResponse;
    const { status } = apiResponse;
    await showToast(Toast.Style.Failure, `${status} Error`, text);
    return errorResponse;
}

// 
export async function getResellerUserAccounts(reseller: string) {
  const params = new URLSearchParams({ reseller });
  return await callApi(`SHOW_USERS?${params}`, "Fetching Users");
}
export async function getUserUsage(user: string) {
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_USAGE?${params}`, "Fetching User Usage");
}
export async function getUserConfig(user: string) {
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_CONFIG?${params}`, "Fetching User Config");
}
export async function getUserDomains(user: string) {
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_DOMAINS?${params}`, "Fetching User Domains");
}

// 
export async function getResellerIPs() {
  return await callApi("SHOW_RESELLER_IPS", "Fetching Reseller IPs");
}
export async function getResellerIPInformation(ip: string) {
     const params = new URLSearchParams({ ip });
  return await callApi(`SHOW_RESELLER_IPS?${params}`, "Fetching Reseller IP Information");
}

// PACKAGES
export async function getUserPackages() {
  return await callApi("PACKAGES_USER", "Fetching User Packages");
}
export async function getUserPackageInformation(packageName: string) {
  const params = new URLSearchParams({ package: packageName });
  return await callApi(`PACKAGES_USER?${params}`, "Fetching User Package Information");
}

// DOMAINS
export async function getDomains() {
  return await callApi("SHOW_DOMAINS", "Fetching Domains");
}
export async function createDomain(body: CreateNewDomainRequest) {
  return await callApi("SHOW_DOMAINS", "Creating Domain", body);
}
export async function getSubdomains(domain: string) {
  return await callApi("SUBDOMAINS", "Fetching Subdomains", { domain });
}
export async function createSubdomain(body: CreateSubdomainRequest) {
  return await callApi("SUBDOMAINS", "Creating Subdomain", body);
}
export async function deleteSubdomain(body: DeleteSubdomainRequest) {
  return await callApi("SUBDOMAINS", "Deleting Subdomain", body);
}

// Databases
export async function getDatabases() {
  return await callApi("DATABASES", "Fetching Databases");
}
export async function createDatabase(body: CreateDatabaseRequest) {
  return await callApi("DATABASES", "Creating Databases", body);
}
export async function deleteDatabase(body: DeleteDatabaseRequest) {
  return await callApi("DATABASES", "Deleting Database", body);
}