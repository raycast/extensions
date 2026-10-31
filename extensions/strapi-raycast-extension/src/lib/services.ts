import { useFetch } from "@raycast/utils";
import { ContentType, ContentTypesResponse, EntriesResponse, Entry, Locale, StrapiFile } from "../types";
import { apiUrl, authHeaders, parseResponse } from "./api";
import { searchableFields } from "./utils";

const PAGE_SIZE = 50;

/**
 * Returns the REST route of a content-type, relative to `/api`.
 */
const contentTypeRoute = (item: Omit<ContentType, "route">) => {
  // Users & Permissions users are exposed on `/api/users`
  if (item.uid === "plugin::users-permissions.user") return "/users";

  const name = item.schema.kind === "singleType" ? item.schema.singularName : item.schema.pluralName;
  return item.plugin ? `/${item.plugin}/${name}` : `/${name}`;
};

/**
 * Fetches the visible content-types from the Strapi API.
 */
export const useContentTypes = () => {
  return useFetch<ContentTypesResponse, ContentType[], ContentType[]>(apiUrl("/content-type-builder/content-types"), {
    headers: authHeaders(),
    parseResponse,
    mapResult: (result: ContentTypesResponse) => ({
      data: result.data
        .filter((item) => item.schema.visible)
        .map((item): ContentType => ({ ...item, route: contentTypeRoute(item) })),
    }),
    initialData: [],
  });
};

export interface EntryQuery {
  status?: "draft" | "published";
  locale?: string;
  search?: string;
}

/**
 * Fetches the entries of a collection-type page by page.
 * @param contentType - The content-type to fetch entries for.
 * @param query - Status, locale and search text to filter on.
 */
export const useEntries = (contentType: ContentType, { status, locale, search }: EntryQuery) => {
  const filters = search
    ? Object.fromEntries(
        searchableFields(contentType).map((field, index) => [`filters[$or][${index}][${field}][$containsi]`, search]),
      )
    : {};

  return useFetch<EntriesResponse, undefined, Entry[]>(
    (options) =>
      apiUrl(contentType.route, {
        status: contentType.schema.draftAndPublish ? status : undefined,
        locale: contentType.schema.pluginOptions?.i18n?.localized ? locale : undefined,
        sort: "updatedAt:desc",
        "pagination[page]": options.page + 1,
        "pagination[pageSize]": PAGE_SIZE,
        ...filters,
      }),
    {
      headers: authHeaders(),
      parseResponse,
      mapResult: (result: EntriesResponse) => {
        if (Array.isArray(result)) return { data: result, hasMore: false };
        if ("roles" in result) return { data: result.roles, hasMore: false };

        const pagination = result.meta?.pagination;
        return { data: result.data, hasMore: pagination ? pagination.page < pagination.pageCount : false };
      },
      keepPreviousData: true,
    },
  );
};

/**
 * Fetches the available locales when the i18n plugin is enabled.
 * @param execute - Whether to fetch the locales.
 */
export const useLocales = (execute: boolean) => {
  return useFetch<Locale[]>(apiUrl("/i18n/locales"), {
    headers: authHeaders(),
    parseResponse,
    execute,
    keepPreviousData: true,
    // Locales are optional, an error here shouldn't interrupt the user
    onError: () => undefined,
  });
};

/**
 * Fetches the files of the media library page by page.
 * @param search - Optional text to filter file names on.
 */
export const useFiles = (search?: string) => {
  return useFetch<StrapiFile[], undefined, StrapiFile[]>(
    (options) =>
      apiUrl("/upload/files", {
        sort: "createdAt:desc",
        // The upload API ignores `pagination[page]`, but supports offset pagination
        start: options.page * PAGE_SIZE,
        limit: PAGE_SIZE,
        "filters[name][$containsi]": search || undefined,
      }),
    {
      headers: authHeaders(),
      parseResponse,
      mapResult: (result: StrapiFile[]) => ({ data: result, hasMore: result.length === PAGE_SIZE }),
      keepPreviousData: true,
    },
  );
};
