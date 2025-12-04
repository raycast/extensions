import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  EntryResponse,
  ComponentResponse,
  ContentType,
  ContentTypeResponse,
  ContentTypesResponse,
  StrapiFile,
} from "../types";
import fetch from "node-fetch";

/**
 * Fetches the content types from the Strapi API.
 * @returns An object containing the fetched content types and the state of the fetch request.
 */
export const getContentTypes = () => {
  const { host, apiKey } = getPreferenceValues();

  const res = useFetch<ContentTypesResponse>(`${host}/api/content-type-builder/content-types`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  let data: ContentType[] = [];

  if (!res.error) {
    data =
      res.data?.data
        .filter((item) => item.schema.visible)
        .map((item) => ({
          ...item,
          route: item.plugin ? `/${item.plugin}/${item.schema.pluralName}` : `/${item.schema.pluralName}`,
        })) || [];
  }

  return { ...res, data };
};

/**
 * Fetches a single content type from the Strapi API.
 * @param uid - The UID of the content type to fetch.
 * @returns The fetched content type.
 */
export const getContentType = (uid: string) => {
  const { host, apiKey } = getPreferenceValues();

  const res = useFetch<ContentTypeResponse>(`${host}/api/content-type-builder/content-types/${uid}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.error) {
    return {
      ...res,
      data: {
        ...res.data?.data,
        route: res.data?.data.plugin
          ? `/${res.data?.data.plugin}/${res.data?.data.schema.pluralName}`
          : `/${res.data?.data.schema.pluralName}`,
      },
    };
  }

  return res;
};

/**
 * Fetches the entries for a given route from the Strapi API.
 *
 * @param route - The API route to fetch entries from.
 * @returns An object containing the fetched entries and the state of the fetch request.
 */
export const getEntries = (route: string) => {
  const { host, apiKey } = getPreferenceValues();

  const res = useFetch<EntryResponse>(`${host}/api${route}?status=draft&pagination[limit]=10000`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  let data: EntryResponse["data"] = [];

  if (!res.error) {
    data = res.data?.data || [];

    // User & Permissions exception
    if (res.data?.roles) data = res.data?.roles;
  }

  return { ...res, data };
};

/**
 * Submits a new entry to the Strapi API.
 * @param route - The API route to submit the entry to.
 * @param data - The data to submit.
 */
export const createEntry = async (route: string, data: object) => {
  const { host, apiKey } = getPreferenceValues();

  const res = await fetch(`${host}/api${route}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  return json;
};

/**
 * Fetch component from the Strapi API.
 * @param uid - The UID of the component to fetch.
 */
export const getComponent = (uid: string) => {
  const { host, apiKey } = getPreferenceValues();

  const res = useFetch<ComponentResponse>(`${host}/api/content-type-builder/components/${uid}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.error) {
    return { ...res, data: res.data?.data };
  }

  return res;
};

/**
 * Get all files from the Strapi API.
 * @returns An array containing the fetched files and the state of the fetch request.
 */
export const getFiles = () => {
  const { host, apiKey } = getPreferenceValues();

  const res = useFetch<StrapiFile[]>(`${host}/api/upload/files`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return res;
};
