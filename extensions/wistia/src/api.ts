import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { AccountInfo, EmbedObject, WistiaApiError, WistiaMedia, WistiaProject, WistiaStats } from "./types";

async function fetchWistia<T>(endpoint: string) {
  const { wistiaApiToken } = getPreferenceValues<Preferences>();
  const url = "https://api.wistia.com/" + endpoint;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${wistiaApiToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok) throw new Error((result as WistiaApiError).code);
  return result as T;
}

export async function fetchEmbedCode({
  accountUrl,
  hashedId,
}: {
  accountUrl: string;
  hashedId: string;
}): Promise<EmbedObject> {
  return fetchWistia<EmbedObject>(`oembed?url=${accountUrl}/medias/${hashedId}&embedType=async`);
}

export async function fetchMedias(): Promise<WistiaMedia[]> {
  return fetchWistia<WistiaMedia[]>("v1/medias.json");
}

export async function fetchAccountInfo(): Promise<AccountInfo> {
  return fetchWistia<AccountInfo>("v1/account.json");
}

export async function fetchProjects(): Promise<WistiaProject[]> {
  return fetchWistia<WistiaProject[]>("v1/projects.json");
}

export async function fetchProjectMedias(projectHashedId: string): Promise<WistiaProject> {
  return fetchWistia<WistiaProject>(`v1/projects/${projectHashedId}.json`);
}

export async function fetchProjectStats(projectHashedId: string): Promise<WistiaStats> {
  return fetchWistia<WistiaStats>(`v1/stats/projects/${projectHashedId}.json`);
}
