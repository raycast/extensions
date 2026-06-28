import { useFetch } from "@raycast/utils";
import { ITEMLIMIT, NEXTDNS_API_BASE_URL, PREFERENCES } from "./constants";
import { DomainListItem, Log, NextDNSErrorResult, NextDNSSuccessResult, Profile } from "../types";
import fetch, { RequestInit } from "node-fetch";
import { getIdHex } from "./utils";

const headers = {
  "X-Api-Key": PREFERENCES.nextdns_api_key,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function makeRequest(endpoint: string, method: string = "GET", body?: Record<string, string | boolean>) {
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
    const result = (await response.json()) as NextDNSErrorResult;
    throw new Error(result.errors[0].code);
  }

  return response.json();
}

export function getLogs() {
  const endpoint = `/profiles/${PREFERENCES.nextdns_profile_id}/logs`;

  return useFetch(
    (options) =>
      `${NEXTDNS_API_BASE_URL}${endpoint}?${new URLSearchParams({ cursor: options.cursor, limit: ITEMLIMIT }).toString()}`,
    {
      mapResult(result: NextDNSSuccessResult<Log[]>) {
        const { data, meta } = result;
        const cursor = meta?.pagination.cursor;
        const hasMore = cursor !== undefined;
        return { data, hasMore, cursor };
      },
      async parseResponse(response) {
        const json = (await response.json()) as NextDNSErrorResult | NextDNSSuccessResult<Log[]>;
        if ("errors" in json) throw new Error(json.errors[0].code);
        return json;
      },
      headers: headers,
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to get endpoint logs." },
      initialData: [],
    },
  );
}

export function getDomains(props: { type: string }) {
  const { type } = props;
  const endpoint = `/profiles/${PREFERENCES.nextdns_profile_id}/${type}list`;

  return useFetch(`${NEXTDNS_API_BASE_URL}${endpoint}`, {
    headers: headers,
    async parseResponse(response) {
      const json = (await response.json()) as NextDNSErrorResult | NextDNSSuccessResult<DomainListItem[]>;
      if ("errors" in json) throw new Error(json.errors[0].code);
      const results = json.data.map((item: DomainListItem) => ({ ...item, type: props.type }));

      return { result: results, profileName: await getProfileName() };
    },
    failureToastOptions: { title: "Failed to get domains." },
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
  });
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
    },
  );
}

export async function connectionStatus() {
  try {
    const response = await fetch("https://test.nextdns.io", {
      method: "GET",
      headers: {
        "User-Agent": "curl",
      },
    });

    if (!response.ok) {
      return "Failed to get status from NextDNS";
    }

    const respJson = (await response.json()) as { status: string; deviceName: string; protocol: string };
    const { status, deviceName, protocol } = respJson;

    if (status === "ok") {
      return `✅  ${deviceName ? deviceName : "This device"} is using NextDNS via ${protocol}`;
    } else {
      return "❌  This device is not using NextDNS";
    }
  } catch (error) {
    return "Failed to reach NextDNS.";
  }
}
