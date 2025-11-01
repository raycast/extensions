import { Toast, showToast } from "@raycast/api";
import {
  BodyRequest,
  ChangeEmailAccountPasswordRequest,
  CreateDatabaseRequest,
  CreateEmailAccountRequest,
  CreateNewDomainRequest,
  CreateSubdomainRequest,
  CreateUserRequest,
  DeleteDatabaseRequest,
  DeleteEmailAccountRequest,
  DeleteSubdomainRequest,
  DeleteUserRequest,
  ErrorResponse,
  GetEmailAccountsRequest,
  GetSessionRequest,
  ChangeUserAccountEmailRequest,
  ModifyUserRequest,
  SuspendOrUnsuspendUserRequest,
  ChangeUserTicketingEmailRequest,
} from "../types";
import fetch, { Response } from "node-fetch";
import { API_URL, RESELLER_PASSWORD, RESELLER_USERNAME, RESELLER_API_TOKEN } from "./constants";
import { showFailureToast } from "@raycast/utils";

const callApi = async (endpoint: string, animatedToastMessage = "", body?: BodyRequest, userToImpersonate = "") => {
  const token =
    userToImpersonate === ""
      ? RESELLER_API_TOKEN
      : btoa(`${RESELLER_USERNAME}|${userToImpersonate}:${RESELLER_PASSWORD}`);
  const headers = { Authorization: `Basic ${token}` };

  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  let apiResponse;
  if (!body) apiResponse = await fetch(API_URL + endpoint, { headers, method: "POST" });
  else
    apiResponse = await fetch(API_URL + endpoint, {
      headers,
      method: "POST",
      body: JSON.stringify(body),
    });
  if (!apiResponse.ok) {
    return returnApiResponseAsError(apiResponse);
  } else {
    const apiResponseContentType = apiResponse.headers.get("Content-Type");
    if (apiResponseContentType?.includes("text/html")) {
      const text = "DirectAdmin Error";
      await showFailureToast(text);
      const errorResponse = {
        error: "1",
        text,
        details: "",
      } as ErrorResponse;
      return errorResponse;
    }
    const response = await apiResponse.text();

    const urlSearchParams = new URLSearchParams(response);
    const params = {} as { [key: string]: string | string[] };
    urlSearchParams.forEach((value, key) => {
      // this accounts for responeses like: list[]=item1&list[]=item2...
      if (urlSearchParams.getAll(key).length > 1 || key.includes("[]")) {
        key = key.replace("[]", ""); // Remove square brackets
        params[key] = ((params[key] as string[]) || []).concat(value);
      } else {
        params[key] = value;
      }
    });

    // Since some endpoints return an error=0 whereas others return no error,
    //  we will add an "error=0" to make error-checking easier
    if (!("error" in params)) params.error = "0";
    if (params.error === "1") {
      const text = urlSearchParams.get("text") as string;
      const details = urlSearchParams.get("details") || "";
      await showFailureToast(details, { title: text });
    }
    return params;
  }
};

async function returnApiResponseAsError(apiResponse: Response) {
  const response = new URLSearchParams(await apiResponse.text());
  const text = response.get("text") as string;
  const details = response.get("details") || "";
  const errorResponse = {
    error: "1",
    text,
    details,
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
export async function getUserUsage(user: string, is_reseller = false) {
  if (is_reseller) return await callApi(`SHOW_USER_USAGE`, "Fetching User Usage");
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_USAGE?${params}`, "Fetching User Usage");
}
export async function getUserConfig(user: string, is_reseller = false) {
  if (is_reseller) return await callApi(`SHOW_USER_CONFIG`, "Fetching User Config");
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_CONFIG?${params}`, "Fetching User Config");
}
export async function getUserDomains(user: string) {
  const params = new URLSearchParams({ user });
  return await callApi(`SHOW_USER_DOMAINS?${params}`, "Fetching User Domains");
}
export async function createUser(body: CreateUserRequest) {
  return await callApi("ACCOUNT_USER", "Creating User", body);
}
export async function deleteUser(body: DeleteUserRequest) {
  return await callApi("SELECT_USERS", "Deleting User", body);
}
export async function suspendOrUnsuspendUser(body: SuspendOrUnsuspendUserRequest) {
  const message = "dosuspend" in body ? "Suspending User" : "Unsuspending User";
  return await callApi("SELECT_USERS", message, body);
}
export async function modifyUser(body: ModifyUserRequest) {
  return await callApi("MODIFY_USER", "Modifying User", body);
}
export async function changeUserAccountEmail(body: ChangeUserAccountEmailRequest, userToImpersonate = "") {
  return await callApi("CHANGE_INFO", "Changing User Account Email", body, userToImpersonate);
}
export async function changeUserTicketingEmail(body: ChangeUserTicketingEmailRequest, userToImpersonate = "") {
  return await callApi("TICKET", "Changing User Ticketing Email", body, userToImpersonate);
}

//
// Moved to Hooks

// PACKAGES
// Moved to Hooks

// DOMAINS
// export async function getDomains() {
export async function createDomain(body: CreateNewDomainRequest, userToImpersonate = "") {
  return await callApi("DOMAIN", "Creating Domain", body, userToImpersonate);
}
export async function getSubdomains(domain: string, userToImpersonate = "") {
  return await callApi("SUBDOMAINS", "Fetching Subdomains", { domain }, userToImpersonate);
}
export async function createSubdomain(body: CreateSubdomainRequest, userToImpersonate = "") {
  return await callApi("SUBDOMAINS", "Creating Subdomain", body, userToImpersonate);
}
export async function deleteSubdomain(body: DeleteSubdomainRequest, userToImpersonate = "") {
  return await callApi("SUBDOMAINS", "Deleting Subdomain", body, userToImpersonate);
}

// Databases
// export async function getDatabases(userToImpersonate = "") {
//   return await callApi("DATABASES", "Fetching Databases", undefined, userToImpersonate);
// }
export async function createDatabase(body: CreateDatabaseRequest, userToImpersonate = "") {
  return await callApi("DATABASES", "Creating Database", body, userToImpersonate);
}
export async function deleteDatabase(body: DeleteDatabaseRequest, userToImpersonate = "") {
  return await callApi("DATABASES", "Deleting Database", body, userToImpersonate);
}

// Session
export async function getSession(body: GetSessionRequest) {
  return await callApi("GET_SESSION", "Fetching Session", body);
}

// Emails
export async function getEmailAccounts(body: GetEmailAccountsRequest, userToImpersonate = "") {
  return await callApi("POP", "Fetching Email Accounts", body, userToImpersonate);
}
export async function changeEmailAccountPassword(body: ChangeEmailAccountPasswordRequest, userToImpersonate = "") {
  return await callApi("CHANGE_EMAIL_PASSWORD", "Changing Email Account Password", body, userToImpersonate);
}
export async function createEmailAccount(body: CreateEmailAccountRequest, userToImpersonate = "") {
  return await callApi("POP", "Creating Email Account", body, userToImpersonate);
}
export async function deleteEmailAccount(body: DeleteEmailAccountRequest, userToImpersonate = "") {
  return await callApi("POP", "Deleting Email Account", body, userToImpersonate);
}
