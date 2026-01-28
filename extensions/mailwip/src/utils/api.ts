import { Toast, showToast } from "@raycast/api";
import {
  BodyRequest,
  ErrorResponse,
  Alias,
  AliasCreate,
  APIMethod,
  AliasCreateResponse,
  Email,
  DomainDelete,
} from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";

const callApi = async (endpoint: string, method: APIMethod, body?: BodyRequest, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
  try {
    let apiResponse;
    if (body) {
      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers: API_HEADERS,
        body: JSON.stringify(body),
      });
    } else {
      apiResponse = await fetch(API_URL + endpoint, {
        method,
        headers: API_HEADERS,
      });
    }

    if (!apiResponse.ok) {
      const contentType = apiResponse.headers.get("content-type");
      const { status, statusText } = apiResponse;
      const error = `${status} Error`;

      if (contentType?.includes("application/json")) {
        const jsonResponse = (await apiResponse.json()) as { message: string } | { errors: string[] };
        if ("errors" in jsonResponse) {
          const message = jsonResponse.errors.join(" | ");
          await showToast(Toast.Style.Failure, error, message);
          return { errors: message };
        } else {
          await showToast(Toast.Style.Failure, error, jsonResponse.message);
          return { errors: jsonResponse.message };
        }
      } else {
        await showToast(Toast.Style.Failure, error, statusText);
        return { errors: statusText };
      }
    }

    const response = await apiResponse.json();
    await showToast(Toast.Style.Success, `Success`);
    return response;
  } catch (err) {
    console.log(err);
    const error = "Failed to execute request. Please try again later.";
    await showToast(Toast.Style.Failure, `Error`, error);
    return { error };
  }
};

// DOMAINS
export async function deleteDomains({ domains }: DomainDelete) {
  return (await callApi(
    `domains/batch/`,
    "DELETE",
    { domains },
    `Deleting Domain${domains.length !== 1 ? "s" : ""}`
  )) as ErrorResponse | { message: string };
}

// ALIASES
export async function getDomainAliases(domain: string) {
  return (await callApi(`domains/${domain}/aliases`, "GET", undefined, "Fetching Aliases")) as
    | ErrorResponse
    | { data: Alias[] };
}
export async function createDomainAlias(domain: string, newAlias: AliasCreate) {
  return (await callApi(`domains/${domain}/aliases`, "POST", newAlias, "Creating Alias")) as
    | ErrorResponse
    | AliasCreateResponse;
}
export async function deleteDomainAlias(domain: string, alias: Alias) {
  return (await callApi(`domains/${domain}/aliases/`, "DELETE", alias, "Deleting Alias")) as
    | ErrorResponse
    | { data: { success: true } };
}

// EMAILS
export async function getEmails(domain: string, status: string, limit: number) {
  const searchParams =
    domain !== "all"
      ? new URLSearchParams({ domain, status, limit: limit.toString() })
      : new URLSearchParams({ status, limit: limit.toString() });
  return (await callApi(`mails?${searchParams}`, "GET", undefined, "Fetching Emails")) as
    | ErrorResponse
    | { data: Email[] };
}
