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
import { showFailureToast } from "@raycast/utils";

const USERNAME = getPreferenceValues<Preferences>().username;
const API_KEY = getPreferenceValues<Preferences>().api_key;
const API_URL = "https://api.migadu.com/v1/";
const encoded = Buffer.from(USERNAME + ":" + API_KEY).toString("base64");
const headers = {
  Authorization: `Basic ${encoded}`,
  "Content-Type": "application/json",
};

export type ApiToastVerbosity = "verbose" | "error";

const callApi = async <T>(
  endpoint: string,
  method: APIMethod,
  body?: BodyRequest,
  verbosity: ApiToastVerbosity = "verbose",
) => {
  if (verbosity === "verbose") {
    await showToast(Toast.Style.Animated, "Processing...");
  }
  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      const err: ErrorResponse = { error: "" };
      if (status > 499 && status < 600) {
        const error = (await apiResponse.json()) as string;
        err.error = error;
      } else {
        const response = (await apiResponse.json()) as ErrorResponse;
        err.error = response.error;
      }
      await showFailureToast(err.error, { title: `${status} Error` });
      return err;
    }

    const response = await apiResponse.json();
    if (verbosity === "verbose") {
      await showToast(Toast.Style.Success, `Success`);
    }
    return response as T;
  } catch (err) {
    const error = "Failed to execute request. Please try again later.";
    await showFailureToast(error, { title: "Error" });
    return { error } as ErrorResponse;
  }
};

// Mailboxes
export async function getMailboxes(domain: string, verbosity: ApiToastVerbosity = "verbose") {
  return await callApi<{ mailboxes: Mailbox[] }>(`domains/${domain}/mailboxes`, "GET", undefined, verbosity);
}
export async function createMailbox(domain: string, newMailbox: MailboxCreate) {
  return await callApi<Mailbox>(`domains/${domain}/mailboxes`, "POST", newMailbox);
}
export async function editMailbox(domain: string, mailboxLocalPart: string, modifiedMailbox: MailboxEdit) {
  return await callApi<Mailbox>(`domains/${domain}/mailboxes/${mailboxLocalPart}`, "PUT", modifiedMailbox);
}
export async function deleteMailbox(domain: string, mailboxLocalPart: string) {
  return await callApi<Mailbox>(`domains/${domain}/mailboxes/${mailboxLocalPart}`, "DELETE");
}

// Identities
export async function getMailboxIdentities(domain: string, mailboxLocalPart: string) {
  return await callApi<{ identities: Identity[] }>(`domains/${domain}/mailboxes/${mailboxLocalPart}/identities`, "GET");
}
export async function createMailboxIdentity(domain: string, mailboxLocalPart: string, newIdentity: IdentityCreate) {
  return await callApi<Identity>(`domains/${domain}/mailboxes/${mailboxLocalPart}/identities`, "POST", newIdentity);
}
export async function editMailboxIdentity(
  domain: string,
  mailboxLocalPart: string,
  identityLocalPart: string,
  modifiedIdentity: IdentityEdit,
) {
  return await callApi<Identity>(
    `domains/${domain}/mailboxes/${mailboxLocalPart}/identities/${identityLocalPart}`,
    "PUT",
    modifiedIdentity,
  );
}
export async function deleteMailboxIdentity(domain: string, mailboxLocalPart: string, identityLocalPart: string) {
  return await callApi<Identity>(
    `domains/${domain}/mailboxes/${mailboxLocalPart}/identities/${identityLocalPart}`,
    "DELETE",
  );
}

// ALIASES
export async function getDomainAliases(domain: string) {
  return await callApi<{ address_aliases: Alias[] }>(`domains/${domain}/aliases`, "GET");
}
export async function createDomainAlias(domain: string, newAlias: AliasCreate) {
  return await callApi<Alias>(`domains/${domain}/aliases`, "POST", newAlias);
}
export async function editDomainAlias(domain: string, aliasLocalPart: string, modifiedAlias: AliasEdit) {
  return await callApi<Alias>(`domains/${domain}/aliases/${aliasLocalPart}`, "PUT", modifiedAlias);
}
export async function deleteDomainAlias(domain: string, aliasLocalPart: string) {
  return await callApi<Alias>(`domains/${domain}/aliases/${aliasLocalPart}`, "DELETE");
}

// REWRITES
export async function getDomainRewrites(domain: string) {
  return await callApi<{ rewrites: Rewrite[] }>(`domains/${domain}/rewrites`, "GET");
}
export async function createDomainRewrite(domain: string, newRewrite: RewriteCreate) {
  return await callApi<Rewrite>(`domains/${domain}/rewrites`, "POST", newRewrite);
}
export async function editDomainRewrite(domain: string, rewriteName: string, modifiedRewrite: RewriteEdit) {
  return await callApi<Rewrite>(`domains/${domain}/rewrites/${rewriteName}`, "PUT", modifiedRewrite);
}
export async function deleteDomainRewrite(domain: string, rewriteName: string) {
  return await callApi<Rewrite>(`domains/${domain}/rewrites/${rewriteName}`, "DELETE");
}
