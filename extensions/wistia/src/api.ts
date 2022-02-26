import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { AccountInfo, EmbedObject, Preferences, WistiaApiError, WistiaMedia, WistiaProject } from "./types";

export async function fetchEmbedCode({
  accountUrl,
  hashedId,
}: {
  accountUrl: string;
  hashedId: string;
}): Promise<EmbedObject> {
  const preferences: Preferences = getPreferenceValues();
  const username = "api";
  const password = preferences.wistiaApiToken;
  const url = `https://api.wistia.com/oembed?url=${accountUrl}/medias/${hashedId}&embedType=async`;
  const authString = `${username}:${password}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw (await response.json()) as WistiaApiError;
  }

  return (await response.json()) as EmbedObject;
}

export async function fetchMedias(): Promise<WistiaMedia[]> {
  const preferences: Preferences = getPreferenceValues();
  const username = "api";
  const password = preferences.wistiaApiToken;
  const url = "https://api.wistia.com/v1/medias.json";
  const authString = `${username}:${password}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw (await response.json()) as WistiaApiError;
  }

  return (await response.json()) as WistiaMedia[];
}

export async function fetchAccountInfo(): Promise<AccountInfo> {
  const preferences: Preferences = getPreferenceValues();
  const username = "api";
  const password = preferences.wistiaApiToken;
  const url = "https://api.wistia.com/v1/account.json";
  const authString = `${username}:${password}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw (await response.json()) as WistiaApiError;
  }

  const accountInfo = (await response.json()) as AccountInfo;
  return accountInfo;
}

export async function fetchProjects(): Promise<WistiaProject[]> {
  const preferences: Preferences = getPreferenceValues();
  const username = "api";
  const password = preferences.wistiaApiToken;
  const url = "https://api.wistia.com/v1/projects.json";
  const authString = `${username}:${password}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw (await response.json()) as WistiaApiError;
  }

  return (await response.json()) as WistiaProject[];
}

export async function fetchProjectMedias(projectHashedId: string): Promise<WistiaProject> {
  const preferences: Preferences = getPreferenceValues();
  const username = "api";
  const password = preferences.wistiaApiToken;
  const url = `https://api.wistia.com/v1/projects/${projectHashedId}.json`;
  const authString = `${username}:${password}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw (await response.json()) as WistiaApiError;
  }

  return (await response.json()) as WistiaProject;
}
