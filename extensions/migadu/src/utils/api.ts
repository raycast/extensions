import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import {
  BodyRequest,
  ErrorResponse,
  Mailbox,
  MailboxCreate,
  MailboxEdit,
  Identity,
  IdentityCreate,
  IdentityEdit,
  Alias,
  AliasCreate,
  AliasEdit,
  Rewrite,
  RewriteCreate,
  RewriteEdit,
  APIMethod,
} from "./types";
import fetch from "node-fetch";

const USERNAME = getPreferenceValues<Preferences>().username;
const API_KEY = getPreferenceValues<Preferences>().api_key;
const API_URL = "https://api.migadu.com/v1/";
const encoded = Buffer.from(USERNAME + ":" + API_KEY).toString("base64");
const headers = {
  Authorization: `Basic ${encoded}`,
  "Content-Type": "application/json",
};

const callApi = async (endpoint: string, method: APIMethod, body?: BodyRequest) => {
  await showToast(Toast.Style.Animated, "Processing...");
  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      if (status > 499 && status < 600) {
        const error = (await apiResponse.json()) as string;
        await showToast(Toast.Style.Failure, `${status} Error`, error);
        return { error };
      } else {
        const response = (await apiResponse.json()) as ErrorResponse;
        await showToast(Toast.Style.Failure, `${status} Error`, response.error);
        return response;
      }
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

// Mailboxes
export async function getMailboxes(domain: string) {
  return (await callApi(`domains/${domain}/mailboxes`, "GET")) as ErrorResponse | { mailboxes: Mailbox[] };
}
export async function createMailbox(domain: string, newMailbox: MailboxCreate) {
  return (await callApi(`domains/${domain}/mailboxes`, "POST", newMailbox)) as ErrorResponse | Mailbox;
}
export async function editMailbox(domain: string, mailboxLocalPart: string, modifiedMailbox: MailboxEdit) {
  return (await callApi(`domains/${domain}/mailboxes/${mailboxLocalPart}`, "PUT", modifiedMailbox)) as
    | ErrorResponse
    | Mailbox;
}
export async function deleteMailbox(domain: string, mailboxLocalPart: string) {
  return (await callApi(`domains/${domain}/mailboxes/${mailboxLocalPart}`, "DELETE")) as ErrorResponse | Mailbox;
}

// Identities
export async function getMailboxIdentities(domain: string, mailboxLocalPart: string) {
  return (await callApi(`domains/${domain}/mailboxes/${mailboxLocalPart}/identities`, "GET")) as
    | ErrorResponse
    | { identities: Identity[] };
}
export async function createMailboxIdentity(domain: string, mailboxLocalPart: string, newIdentity: IdentityCreate) {
  return (await callApi(`domains/${domain}/mailboxes/${mailboxLocalPart}/identities`, "POST", newIdentity)) as
    | ErrorResponse
    | Identity;
}
export async function editMailboxIdentity(
  domain: string,
  mailboxLocalPart: string,
  identityLocalPart: string,
  modifiedIdentity: IdentityEdit
) {
  return (await callApi(
    `domains/${domain}/mailboxes/${mailboxLocalPart}/identities/${identityLocalPart}`,
    "PUT",
    modifiedIdentity
  )) as ErrorResponse | Identity;
}
export async function deleteMailboxIdentity(domain: string, mailboxLocalPart: string, identityLocalPart: string) {
  return (await callApi(
    `domains/${domain}/mailboxes/${mailboxLocalPart}/identities/${identityLocalPart}`,
    "DELETE"
  )) as ErrorResponse | Identity;
}

// ALIASES
export async function getDomainAliases(domain: string) {
  return (await callApi(`domains/${domain}/aliases`, "GET")) as ErrorResponse | { address_aliases: Alias[] };
}
export async function createDomainAlias(domain: string, newAlias: AliasCreate) {
  return (await callApi(`domains/${domain}/aliases`, "POST", newAlias)) as ErrorResponse | Alias;
}
export async function editDomainAlias(domain: string, aliasLocalPart: string, modifiedAlias: AliasEdit) {
  return (await callApi(`domains/${domain}/aliases/${aliasLocalPart}`, "PUT", modifiedAlias)) as ErrorResponse | Alias;
}
export async function deleteDomainAlias(domain: string, aliasLocalPart: string) {
  return (await callApi(`domains/${domain}/aliases/${aliasLocalPart}`, "DELETE")) as ErrorResponse | Alias;
}

// REWRITES
export async function getDomainRewrites(domain: string) {
  return (await callApi(`domains/${domain}/rewrites`, "GET")) as ErrorResponse | { rewrites: Rewrite[] };
}
export async function createDomainRewrite(domain: string, newRewrite: RewriteCreate) {
  return (await callApi(`domains/${domain}/rewrites`, "POST", newRewrite)) as ErrorResponse | Rewrite;
}
export async function editDomainRewrite(domain: string, rewriteName: string, modifiedRewrite: RewriteEdit) {
  return (await callApi(`domains/${domain}/rewrites/${rewriteName}`, "PUT", modifiedRewrite)) as
    | ErrorResponse
    | Rewrite;
}
export async function deleteDomainRewrite(domain: string, rewriteName: string) {
  return (await callApi(`domains/${domain}/rewrites/${rewriteName}`, "DELETE")) as ErrorResponse | Rewrite;
}
