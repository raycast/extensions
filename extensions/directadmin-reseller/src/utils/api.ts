import { Toast, showToast } from "@raycast/api";
import {
  ErrorResponse
} from "../types";
import fetch, { Response } from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";
import { showFailureToast } from "@raycast/utils";

const callApi = async (endpoint: string, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  const apiResponse = await fetch(API_URL + "CMD_API_" + endpoint, { headers: API_HEADERS, method: "GET" });
  if (!apiResponse.ok) {
    return returnApiResponseAsError(apiResponse);
  } else {
    const apiResponseContentType = apiResponse.headers.get('Content-Type');
    if (apiResponseContentType?.includes("text/html")) {
        await showFailureToast("DirectAdmin Error");
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
