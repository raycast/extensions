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
  NewErrorResponse,
  RevokeKeyResponse,
  UpdateKeyRequest,
  VerifyKeyResponse,
} from "./types";
import { API_HEADERS, API_URL } from "./constants";

const callApi = async (endpoint: string, method: ApiMethod, body?: BodyRequest, animatedToastMessage = "") => {
  const toast = await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

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

      toast.style = Toast.Style.Failure;
      toast.title = error;
      toast.message = response.error;
      return response;
    }

    const response = await apiResponse.json();
    toast.style = Toast.Style.Success;
    toast.title = `Success`;
    toast.message = "";
    return response;
  } catch {
    const error = "Failed to execute request. Please try again later.";
    toast.style = Toast.Style.Failure;
    toast.title = `Error`;
    toast.message = error;
    return { error };
  }
};

// APIs
export async function getApiInfo(apiId: string) {
  return (await callApi(`apis.getApi?apiId=${apiId}`, "GET", undefined, "Retrieving API Info")) as
    | NewErrorResponse
    | GetApiInfoResponse;
}
export async function getApiKeys(apiId: string, query: GetApiKeysQuery) {
  if (!query.ownerId) delete query.ownerId;
  const queryParams = new URLSearchParams({ apiId, ...query });
  return (await callApi(`apis.listKeys?${queryParams}`, "GET", undefined, "Retrieving API Keys")) as
    | NewErrorResponse
    | GetApiKeysResponse;
}

// KEYs
export async function revokeKey(keyId: string) {
  return (await callApi(`keys.deleteKey`, "POST", { keyId }, "Revoking Key")) as ErrorResponse | RevokeKeyResponse;
}
export async function createKey(options: CreateKeyRequest) {
  return (await callApi(`keys.createKey`, "POST", { ...options }, "Creating Key")) as
    | NewErrorResponse
    | CreateKeyResponse;
}
export async function verifyKey(key: string) {
  return (await callApi(`keys/verify`, "POST", { key }, "Verifying Key")) as ErrorResponse | VerifyKeyResponse;
}
export async function updateKey(keyId: string, options: UpdateKeyRequest) {
  return (await callApi(`keys/${keyId}`, "PUT", { ...options }, "Updating Key")) as
    | ErrorResponse
    | Record<string, never>;
}
