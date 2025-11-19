import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import {
  DomainsResponse,
  TempEmail,
  MessagesResponse,
  MessageDetail,
  AccountResponse,
  TokenResponse,
  GenerateEmailOptions,
} from "./types";
import { API, EXPIRATION_DAYS, HTTP_STATUS, HTTP_HEADERS, ERROR_MESSAGES, API_RESPONSE, TIME } from "./constants";

export async function getAvailableDomains(): Promise<string[]> {
  const domainsResponse = await fetch(`${API}/domains`);
  const domains: DomainsResponse = (await domainsResponse.json()) as DomainsResponse;
  return domains[API_RESPONSE.HYDRA_MEMBER].map((d) => d.domain);
}

export async function generateEmail(options?: GenerateEmailOptions): Promise<TempEmail> {
  const domainsResponse = await fetch(`${API}/domains`);
  const domains: DomainsResponse = (await domainsResponse.json()) as DomainsResponse;

  const domain = options?.customDomain || domains[API_RESPONSE.HYDRA_MEMBER][0].domain;

  let address: string;
  if (options?.customAddress) {
    address = `${options.customAddress}@${domain}`;
  } else {
    const randomUsername = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "",
      length: 3,
      style: "lowerCase",
    });
    address = `${randomUsername}@${domain}`;
  }

  const password =
    options?.customPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

  const accountResponse = await fetch(`${API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": HTTP_HEADERS.CONTENT_TYPE_JSON },
    body: JSON.stringify({ address, password }),
  });

  if (!accountResponse.ok) {
    console.log(accountResponse);

    if (accountResponse.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT);
    }

    throw new Error(ERROR_MESSAGES.ACCOUNT_CREATE_FAILED);
  }

  const accountData = (await accountResponse.json()) as AccountResponse;
  const accountId = accountData.id;

  const tokenResponse = await fetch(`${API}/token`, {
    method: "POST",
    headers: { "Content-Type": HTTP_HEADERS.CONTENT_TYPE_JSON },
    body: JSON.stringify({ address, password }),
  });

  if (!tokenResponse.ok) {
    throw new Error(ERROR_MESSAGES.TOKEN_FAILED);
  }

  const tokenData = (await tokenResponse.json()) as TokenResponse;
  const token = tokenData.token;

  const createdAt = Date.now();
  const expiresAt = createdAt + EXPIRATION_DAYS * TIME.MILLISECONDS_IN_DAY;
  const id = `${address}-${createdAt}`;

  return { id, address, password, token, accountId, createdAt, expiresAt };
}

export async function deleteEmailFromAPI(accountId: string, token: string): Promise<void> {
  const response = await fetch(`${API}/accounts/${accountId}`, {
    method: "DELETE",
    headers: {
      Authorization: `${HTTP_HEADERS.AUTHORIZATION_BEARER_PREFIX} ${token}`,
    },
  });

  if (!response.ok && response.status !== HTTP_STATUS.NOT_FOUND) {
    throw new Error(ERROR_MESSAGES.ACCOUNT_DELETE_FAILED);
  }
}

export async function getMessages(token: string): Promise<MessagesResponse> {
  const response = await fetch(`${API}/messages?page=1`, {
    method: "GET",
    headers: {
      Authorization: `${HTTP_HEADERS.AUTHORIZATION_BEARER_PREFIX} ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT);
    }
    throw new Error(ERROR_MESSAGES.MESSAGES_FETCH_FAILED);
  }

  return (await response.json()) as MessagesResponse;
}

export async function getMessageDetail(messageId: string, token: string): Promise<MessageDetail> {
  const response = await fetch(`${API}/messages/${messageId}`, {
    method: "GET",
    headers: {
      Authorization: `${HTTP_HEADERS.AUTHORIZATION_BEARER_PREFIX} ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT);
    }
    throw new Error(ERROR_MESSAGES.MESSAGE_DETAILS_FAILED);
  }

  return (await response.json()) as MessageDetail;
}

export async function markMessageAsSeen(messageId: string, token: string): Promise<void> {
  const response = await fetch(`${API}/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `${HTTP_HEADERS.AUTHORIZATION_BEARER_PREFIX} ${token}`,
      "Content-Type": HTTP_HEADERS.CONTENT_TYPE_MERGE_PATCH,
    },
    body: JSON.stringify({ seen: true }),
  });

  if (!response.ok && response.status !== HTTP_STATUS.NOT_FOUND) {
    console.error("Failed to mark message as seen");
  }
}
