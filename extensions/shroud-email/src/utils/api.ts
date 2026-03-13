import { Toast, showToast } from "@raycast/api";
import {
  ErrorResponse,
  Alias,
  APIMethod,
  TokenRequest,
  TokenResponse,
  ErrorResponseObject,
  DomainsRequestParameters,
  DomainsResponse,
  AliasesRequestParameters,
  AliasesResponse,
  AliasesCreateRequest,
  APIHeaders,
  BodyRequest,
} from "./types";
import fetch from "node-fetch";
import { API_TOKEN, API_URL } from "./constants";

const headers: APIHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_TOKEN}`,
};
const callApi = async (endpoint: string, method: APIMethod, body?: BodyRequest, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    let apiResponse;
    if (body) {
      if (endpoint === "token") delete headers.Authorization;
      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers,
        body: JSON.stringify(body),
      });
    } else {
      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers,
      });
    }

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      const error = `${status} Error`;

      const response = (await apiResponse.json()) as ErrorResponse;
      const errorObject = { error: "" };
      if (typeof response === "string") errorObject.error = response;
      else errorObject.error = response.error;

      await showToast(Toast.Style.Failure, error, errorObject.error);
      return errorObject;
    }

    const response = await apiResponse.json();
    await showToast(Toast.Style.Success, `Success`);
    return response;
  } catch (err) {
    const error = "Failed to execute request. Please try again later.";
    await showToast(Toast.Style.Failure, `Error`, error);
    return { error };
  }
};

// TOKEN
export async function createToken({ email, password, totp }: TokenRequest) {
  const body = totp ? { email, password, totp } : { email, password };
  return (await callApi(`token`, "POST", body)) as ErrorResponseObject | TokenResponse;
}

// DOMAINS
export async function getDomains({ page_size, page }: DomainsRequestParameters) {
  const searchParams = new URLSearchParams({ page_size, page });
  return (await callApi(`domains?${searchParams}`, "GET", undefined, "Fetching Domains")) as
    | ErrorResponseObject
    | DomainsResponse;
}

// ALIASES
export async function getAliases({ page_size, page }: AliasesRequestParameters) {
  const searchParams = new URLSearchParams({ page_size, page });
  return (await callApi(`aliases?${searchParams}`, "GET", undefined, "Fetching Aliases")) as
    | ErrorResponseObject
    | AliasesResponse;
}
export async function createAlias({ local_part, domain }: AliasesCreateRequest) {
  const body = local_part && domain ? { local_part, domain } : {};
  return (await callApi(`aliases`, "POST", body, "Creating Alias")) as ErrorResponseObject | Alias;
}
