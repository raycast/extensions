import { Toast, showToast } from "@raycast/api";
import {
  APIMethod,
  AddDomainRequest,
  AddDomainResponse,
  BodyRequest,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  CreateContactRequest,
  CreateContactResponse,
  ErrorResponse,
  GetAPIKeysResponse,
  GetAudiencesResponse,
  GetContactsResponse,
  GetEmailResponse,
  SendEmailRequest,
  SendEmailResponse,
  UpdateContactRequest,
  UpdateContactResponse,
  VerifyDomainResponse,
} from "./types";
import { API_HEADERS, API_URL } from "./constants";

const headers = API_HEADERS;
const callApi = async (endpoint: string, method: APIMethod, body?: BodyRequest, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    let apiResponse;
    if (body) {
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
      const response = (await apiResponse.json()) as ErrorResponse;
      const error = `${response.statusCode} Error`;
      await showToast(Toast.Style.Failure, error, response.message);
      return response;
    }

    await showToast(Toast.Style.Success, `Success`);
    if (apiResponse.headers.get("content-length") == "0") return {};

    const response = await apiResponse.json();
    return response;
  } catch {
    const message = "Failed to execute request. Please try again later.";
    await showToast(Toast.Style.Failure, `Error`, message);
    return { name: "error", message, statusCode: 400 } as ErrorResponse;
  }
};

// API KEYS
export async function getApiKeys() {
  return (await callApi(`api-keys`, "GET", undefined, "Fetching API Keys")) as ErrorResponse | GetAPIKeysResponse;
}
export async function createApiKey(newKey: CreateAPIKeyRequest) {
  return (await callApi(`api-keys`, "POST", { ...newKey }, "Creating API Key")) as ErrorResponse | CreateAPIKeyResponse;
}
export async function deleteApiKey(id: string) {
  return (await callApi(`api-keys/${id}`, "DELETE", undefined, "Deleting API Key")) as
    | ErrorResponse
    | Record<string, never>;
}

// DOMAINS
// export async function getDomains() { -> MOVED TO HOOK

export async function addDomain(newDomain: AddDomainRequest) {
  return (await callApi(`domains`, "POST", { ...newDomain }, "Adding Domain")) as ErrorResponse | AddDomainResponse;
}
export async function verifyDomain(id: string) {
  return (await callApi(`domains/${id}/verify`, "POST", undefined, "Verifying Domain")) as
    | ErrorResponse
    | VerifyDomainResponse;
}
export async function deleteDomain(id: string) {
  return (await callApi(`domains/${id}`, "DELETE", undefined, "Deleting Domain")) as
    | ErrorResponse
    | Record<string, never>;
}

// EMAILS
export async function getEmail(id: string) {
  return (await callApi(`emails/${id}`, "GET", undefined, "Fetching Email")) as ErrorResponse | GetEmailResponse;
}
export async function sendEmail(newEmail: SendEmailRequest) {
  return (await callApi(`emails`, "POST", { ...newEmail }, "Sending Email")) as ErrorResponse | SendEmailResponse;
}

// AUDIENCES
export async function getAudiences() {
  return (await callApi(`audiences`, "GET", undefined, "Fetching Audiences")) as ErrorResponse | GetAudiencesResponse;
}

// CONTACTS
export async function getContacts(id: string) {
  return (await callApi(`audiences/${id}/contacts`, "GET", undefined, "Fetching Contacts")) as
    | ErrorResponse
    | GetContactsResponse;
}

export async function createContact(id: string, newContact: CreateContactRequest) {
  return (await callApi(`audiences/${id}/contacts`, "POST", { ...newContact }, "Adding Contact")) as
    | ErrorResponse
    | CreateContactResponse;
}

export async function deleteContact(audienceId: string, contactId: string) {
  return (await callApi(`audiences/${audienceId}/contacts/${contactId}`, "DELETE", undefined, "Deleting Contact")) as
    | ErrorResponse
    | Record<string, never>;
}

export async function updateContact(audienceId: string, contactId: string, updatedContact: UpdateContactRequest) {
  return (await callApi(
    `audiences/${audienceId}/contacts/${contactId}`,
    "PATCH",
    { ...updatedContact },
    "Updating Contact",
  )) as ErrorResponse | UpdateContactResponse;
}
