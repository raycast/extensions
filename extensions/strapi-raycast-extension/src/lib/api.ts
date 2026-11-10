import { getPreferenceValues } from "@raycast/api";
import { ContentKind, StrapiFile } from "../types";

type QueryParams = Record<string, string | number | undefined>;

/**
 * Returns the configured Strapi host without trailing slashes.
 */
export const baseUrl = () => getPreferenceValues<Preferences>().host.trim().replace(/\/+$/, "");

/**
 * Returns the authorization headers for the Strapi API.
 */
export const authHeaders = () => ({
  Authorization: `Bearer ${getPreferenceValues<Preferences>().apiKey}`,
});

/**
 * Parses a Strapi API response. Failed requests throw an error with the HTTP status and Strapi's error message,
 * as Strapi doesn't send a status text.
 */
export const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.text();

  let json: unknown;
  try {
    json = body ? JSON.parse(body) : undefined;
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    const message = (json as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error([`${response.status} ${response.statusText}`.trim(), message].filter(Boolean).join(": "));
  }

  return json as T;
};

/**
 * Builds a Strapi REST API URL.
 * @param path - The path after `/api`, e.g. `/articles`.
 * @param params - Query parameters, undefined values are skipped.
 */
export const apiUrl = (path: string, params: QueryParams = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.append(key, value.toString());
  });

  const search = query.toString();
  return `${baseUrl()}/api${path}${search ? `?${search}` : ""}`;
};

/**
 * Builds a URL to the Strapi admin content manager.
 * @param uid - The UID of the content-type.
 * @param kind - The kind of the content-type.
 * @param documentId - Optional document to open.
 */
export const adminUrl = (uid: string, kind: ContentKind, documentId?: string) => {
  const segment = kind === "singleType" ? "single-types" : "collection-types";
  return `${baseUrl()}/admin/content-manager/${segment}/${uid}${documentId ? `/${documentId}` : ""}`;
};

/**
 * Returns the absolute URL of a file. Upload providers like S3 or Cloudinary already return absolute URLs.
 */
export const fileUrl = (file: Pick<StrapiFile, "url">) => {
  return /^https?:\/\//.test(file.url) ? file.url : `${baseUrl()}${file.url}`;
};
