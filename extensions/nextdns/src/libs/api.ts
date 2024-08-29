import { useFetch } from "@raycast/utils";
import { NEXTDNS_API_BASE_URL, PREFERENCES } from "./constants";
import { DomainListItem, Profile } from "../types/nextdns";
import fetch from "node-fetch";

const headers = {
  "X-Api-Key": PREFERENCES.nextdns_api_key,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function fetchData(endpoint: string) {
  const response = await fetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, {
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
}

export function getList(props: { type: string }) {
  const { type } = props;
  const endpoint = `/profiles/${PREFERENCES.nextdns_profile_id}/${type}list`;

  return useFetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, {
    headers: headers,
    async parseResponse(response) {
      const json = await response.json();
      return { result: json.data as DomainListItem[], profileName: await getProfileName() };
    },
  });
}

export async function getProfileName() {
  const json = (await fetchData(`/profiles/${PREFERENCES.nextdns_profile_id}`)) as Profile;
  return json?.data?.name || "Unknown";
}
