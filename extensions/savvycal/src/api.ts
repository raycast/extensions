import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, SchedulingLink, PaginatedList } from "./types";

export const SAVVYCAL_BASE_URL = "https://savvycal.com";
export const SAVVYCAL_API_BASE_URL = "https://api.savvycal.com";
const preferences: Preferences = getPreferenceValues();
const apiToken = preferences.SavvycalToken;
const personalSlug = preferences.personalSlug;
const linksEndpoint = "/v1/links";

export async function fetchLinksList(): Promise<PaginatedList<SchedulingLink>> {
  const response = await fetch(SAVVYCAL_API_BASE_URL + linksEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${Buffer.from(apiToken)}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw `Error: ${await response.json()}`;
  }

  return (await response.json()) as PaginatedList<SchedulingLink>;
}

export async function toggleLink(link_id: string) {
  const response = await fetch(
    SAVVYCAL_API_BASE_URL + linksEndpoint + "/" + link_id + "/toggle",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Buffer.from(apiToken)}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw `Error: ${await response.json()}`;
  }

  return (await response.json()) as SchedulingLink;
}
