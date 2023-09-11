import fetch from "node-fetch";
import {
  AirtableBaseMetadata,
  AirtableMetadataApiBaseDetails,
  AirtableMetadataApiBaseListResponse,
  AirtableMetadataApiBaseSchemaResponse,
  RaycastExtensionPreferences,
} from "./types";
import { client } from "./oauth-client";
import { getPreferenceValues, Cache } from "@raycast/api";

const { airtableUiBaseUrl, airtableApiBaseUrl } = getPreferenceValues<RaycastExtensionPreferences>();
const cache = new Cache();

const FETCHED_BASES_CACHE_KEY = "fetchedBases";

export function getCachedBaseList(): Array<AirtableBaseMetadata> {
  const cachedBaseListString = cache.get(FETCHED_BASES_CACHE_KEY);
  return cachedBaseListString ? JSON.parse(cachedBaseListString) : [];
}

export async function fetchBaseListPage(offset?: string): Promise<AirtableMetadataApiBaseListResponse> {
  const offsetParam = offset ? `?offset=${offset}` : "";
  const response = await fetch(`${airtableApiBaseUrl}/v0/meta/bases${offsetParam}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch base list error:", await response.text());
    throw new Error(response.statusText);
  }

  const baseListResponse = (await response.json()) as AirtableMetadataApiBaseListResponse;

  return baseListResponse;
}

export async function fetchBaseList(): Promise<AirtableBaseMetadata[]> {
  const baseListResponses = [];

  // Fetch all pages of bases from the Airtable Metadata API
  let bases, offset;
  ({ bases, offset } = await fetchBaseListPage());
  baseListResponses.push(...bases);
  while (offset) {
    ({ bases, offset } = await fetchBaseListPage(offset));
    baseListResponses.push(...bases);
  }

  const baseList = baseListResponses.map(baseMetadataToItem);
  cache.set(FETCHED_BASES_CACHE_KEY, JSON.stringify(baseList));

  return baseList;
}

function baseMetadataToItem(base: AirtableMetadataApiBaseDetails): AirtableBaseMetadata {
  return {
    id: base.id,
    title: base.name,
    baseUrl: `${airtableUiBaseUrl}/${base.id}`,
    apiDocsUrl: `${airtableUiBaseUrl}/${base.id}/api/docs`,
    permissionLevel: base.permissionLevel,
  };
}

function getBaseSchemaCacheKey(baseId: string): string {
  return `baseMetadata-${baseId}`;
}

export function getCachedBaseSchemaIfExists(baseId: string): AirtableMetadataApiBaseSchemaResponse | null {
  const cacheKey = getBaseSchemaCacheKey(baseId);
  const cachedBaseSchema = cache.get(cacheKey);
  return cachedBaseSchema ? JSON.parse(cachedBaseSchema) : null;
}

export async function fetchBaseSchema(baseId: string): Promise<AirtableMetadataApiBaseSchemaResponse> {
  const response = await fetch(`${airtableApiBaseUrl}/v0/meta/bases/${baseId}/tables`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch base schema error:", await response.text());
    throw new Error(response.statusText);
  }

  const baseSchema = (await response.json()) as AirtableMetadataApiBaseSchemaResponse;
  cache.set(getBaseSchemaCacheKey(baseId), JSON.stringify(baseSchema));
  return baseSchema;
}
