import { Toast, showToast } from "@raycast/api";
import {
  ApiMethod,
  BodyRequest,
  CreateKeyRequest,
  CreateKeyResponse,
  ErrorResponse,
  GetApiInfoResponse,
  GetApiKeysQuery,
  GetApiKeysResponse,
  RevokeKeyResponse,
  UpdateKeyRequest,
  VerifyKeyResponse,
} from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";

const callApi = async (endpoint: string, method: ApiMethod, body?: BodyRequest, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    let apiResponse;

    if (method === "GET") {
      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers: API_HEADERS,
      });
    } else {
      if (endpoint === "keys/verify") delete API_HEADERS.Authorization;

      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers: API_HEADERS,
        body: JSON.stringify(body),
      });
    }

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      const error = `${status} Error`;

      const response = (await apiResponse.json()) as ErrorResponse;

      await showToast(Toast.Style.Failure, error, response.error);
      return response;
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

// APIs
export async function getApiInfo(apiId: string) {
  return (await callApi(`apis/${apiId}`, "GET", undefined, "Retrieving API Info")) as
    | ErrorResponse
    | GetApiInfoResponse;
}
export async function getApiKeys(apiId: string, query: GetApiKeysQuery) {
  if (!query.ownerId) delete query.ownerId;
  const queryParams = new URLSearchParams({ ...query });
  return (await callApi(`apis/${apiId}/keys?${queryParams}`, "GET", undefined, "Retrieving API Keys")) as
    | ErrorResponse
    | GetApiKeysResponse;
}

// KEYs
export async function revokeKey(keyId: string) {
  return (await callApi(`keys/${keyId}`, "DELETE", undefined, "Revoking Key")) as ErrorResponse | RevokeKeyResponse;
}
export async function createKey(options: CreateKeyRequest) {
  return (await callApi(`keys`, "POST", { ...options }, "Creating Key")) as ErrorResponse | CreateKeyResponse;
}
export async function verifyKey(key: string) {
  return (await callApi(`keys/verify`, "POST", { key }, "Verifying Key")) as ErrorResponse | VerifyKeyResponse;
}
export async function updateKey(keyId: string, options: UpdateKeyRequest) {
  return (await callApi(`keys/${keyId}`, "PUT", { ...options }, "Updating Key")) as
    | ErrorResponse
    | Record<string, never>;
}
