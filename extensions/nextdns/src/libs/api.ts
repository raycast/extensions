import { useFetch } from "@raycast/utils";
import { NEXTDNS_API_BASE_URL, PREFERENCES } from "./constants";
import { DomainListItem, NextDNSError, Profile } from "../types";
import fetch, { BodyInit } from "node-fetch";
import { getIdHex } from "./utils";

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
  if (method === "PATCH" || method === "DELETE" || method === "PUT" || method === "POST") {
    if (response.status === 204) return response.status;
    const result = (await response.json()) as { errors: NextDNSError[] };
    throw new Error(result.errors[0].code);
  }

  return response.json();
}

export function getLogs() {
  const endpoint = `/profiles/${PREFERENCES.nextdns_profile_id}/logs`;

  return useFetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, {
    headers: headers,
    async parseResponse(response) {
      const json = await response.json();
      return json;
    },
  });
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
    initialData: { result: [], profileName: "" },
  });
}

export async function getProfileName() {
  const json = (await makeRequest(`/profiles/${PREFERENCES.nextdns_profile_id}`)) as Profile;
  return json?.data?.name || "Unknown";
}

export async function addDomain(props: { domain: string; type: string }) {
  const { domain, type } = props;
  await makeRequest(`/profiles/${PREFERENCES.nextdns_profile_id}/${type}list`, "POST", {
    id: domain,
    active: true,
  } as BodyInit);
}

export async function removeDomain(props: { element: DomainListItem }) {
  const { element } = props;

  await makeRequest(
    `/profiles/${PREFERENCES.nextdns_profile_id}/${element.type}list/hex:${getIdHex(element.id)}`,
    "DELETE",
  );
}

export async function toggleDomain(props: { element: DomainListItem }) {
  const { element } = props;

  await makeRequest(
    `/profiles/${PREFERENCES.nextdns_profile_id}/${element.type}list/hex:${getIdHex(element.id)}`,
    "PATCH",
    {
      active: element.active,
    } as BodyInit,
  );
}
