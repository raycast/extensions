import {
  CreateRoutingRequest,
  CreateUserRequest,
  ErrorResponse,
  RequestBody,
  Response,
  DeleteAppPasswordRequest,
  CreateAppPasswordRequest,
  ModifyUserRequest,
} from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_METHOD, API_URL } from "./constants";
import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const callApi = async (
  endpoint: string,
  body: RequestBody,
  animatedToastMessage = "",
  successToastMessage = "",
  hideToasts = false,
) => {
  try {
    if (!hideToasts) await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

    const apiResponse = await fetch(API_URL + endpoint, {
      method: API_METHOD,
      headers: API_HEADERS,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorResponse = {
        type: "error",
        code: "purelymailError",
        message:
          "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Purelymail Account](https://purelymail.com/manage/account). If you need help, please contact support@purelymail.com",
      } as ErrorResponse;
      await showFailureToast(errorResponse.message, { title: errorResponse.code });
      return errorResponse;
    }

    const response = (await apiResponse.json()) as Response;
    if (!hideToasts) {
      if (response.type === "success") await showToast(Toast.Style.Success, "SUCCESS", successToastMessage);
      else await showFailureToast(response.message, { title: response.code });
    }
    return response;
  } catch (error) {
    const errorResponse = {
      type: "error",
      code: "purelymailError",
      message: "Failed to execute request. Please try again later.",
    } as ErrorResponse;
    if (!hideToasts) await showFailureToast(errorResponse.message, { title: errorResponse.code });
    return errorResponse;
  }
};

// MOVED TO hooks (delete this once all are moved):
// getUsers
// deleteUser
// getRoutingRules
// deleteRoutingRule
// getDomains
// updateDomainSettings
export async function modifyUser({ ...params }: ModifyUserRequest) {
  const body = { ...params };
  return await callApi("modifyUser", body);
}
export async function createUser({ ...params }: CreateUserRequest) {
  const body = { ...params };
  return await callApi("createUser", body);
}

export async function getOwnershipCode() {
  const body = {};
  return await callApi("getOwnershipCode", body, "Fetching Ownership Code", "Fetched Ownership Code");
}
export async function addDomain(domainName: string) {
  const body = { domainName };
  return await callApi("addDomain", body);
}
export async function deleteDomain(name: string) {
  const body = { name };
  return await callApi("deleteDomain", body, "Deleting Domain", "Deleted Domain");
}

export async function createRoutingRule({ ...params }: CreateRoutingRequest) {
  const body = { ...params };
  return await callApi("createRoutingRule", body, "Creating Routing Rule", "Created Routing Rule");
}

export async function getAccountCredit({ hideToasts = false }) {
  const body = {};
  return await callApi("checkAccountCredit", body, "Fetching Account Credit", "Fetched Account Credit", hideToasts);
}

export async function createAppPassword({ ...params }: CreateAppPasswordRequest) {
  const body = { ...params };
  return await callApi("createAppPassword", body, "Creating App Password", "Created App Password");
}
export async function deleteAppPassword({ ...params }: DeleteAppPasswordRequest) {
  const body = { ...params };
  return await callApi("deleteAppPassword", body, "Deleting App Password", "Deleted App Password");
}
