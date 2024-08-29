import { useFetch } from "@raycast/utils";
import { NEXTDNS_API_BASE_URL, PREFERENCES } from "./constants";
import { DomainListItem, Profile } from "../types/nextdns";
import fetch, { BodyInit } from "node-fetch";

const headers = {
  "X-Api-Key": PREFERENCES.nextdns_api_key,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function makeRequest(endpoint: string, method: string = "GET", body?: BodyInit) {
  const options: RequestInit = {
    method,
    headers: headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  // Handle methods that might not return data
  if (method === "PATCH" || method === "DELETE" || method === "PUT") {
    return response.status;
  }

  return response.json();
}

export function getDomains(props: { type: string }) {
  const { type } = props;
  const endpoint = `/profiles/${PREFERENCES.nextdns_profile_id}/${type}list`;

  return useFetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, {
    headers: headers,
    async parseResponse(response) {
      const json = await response.json();
      const results = json.data.map((item: DomainListItem) => ({ ...item, type: props.type }));

      return { result: results, profileName: await getProfileName() };
    },
  });
}

export async function getProfileName() {
  const json = (await makeRequest(`/profiles/${PREFERENCES.nextdns_profile_id}`)) as Profile;
  return json?.data?.name || "Unknown";
}

export async function addDomain() {}

export async function removeDomain() {}

export async function toggleDomain(props: { element: DomainListItem }) {
  const { element } = props;
  const idHex = Buffer.from(element.id).toString("hex");

  await makeRequest(`/profiles/${PREFERENCES.nextdns_profile_id}/${element.type}list/hex:${idHex}`, "PATCH", {
    active: !element.active,
  } as BodyInit);
}
