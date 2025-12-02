import { getPreferenceValues } from "@raycast/api";
import { Document, ErrorResult, Organization, SearchResult, Tag } from "./types";

const { papra_url, api_token } = getPreferenceValues<Preferences>();
const API_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${api_token}`,
};

export const PAPRA_COLOR = "#d9ff7a";

export const buildPapraUrl = (route: string) => new URL(route, papra_url);

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const url = buildPapraUrl(`api/${endpoint}`);
  if (url.hostname === "dashboard.papra.app") url.hostname = "api.papra.app";
  const headers =
    options?.body instanceof FormData ? API_HEADERS : { ...API_HEADERS, "Content-Type": "application/json" };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  if (response.status === 204) return undefined as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Unknown Error");
  const result = await response.json();
  if (!response.ok) {
    const { error } = result as ErrorResult;
    throw new Error(error.details?.length ? `${error.details[0].message}: ${error.details[0].path}` : error.message);
  }
  return result as T;
};
export const papra = {
  documents: {
    create: (props: { organizationId: string; body: FormData }) =>
      makeRequest(`organizations/${props.organizationId}/documents`, {
        method: "POST",
        body: props.body,
      }),
    delete: (props: { organizationId: string; id: string }) =>
      makeRequest(`organizations/${props.organizationId}/documents/${props.id}`, {
        method: "DELETE",
      }),
    get: (props: { organizationId: string; id: string }) =>
      makeRequest<{ document: Document & { content: string } }>(
        `organizations/${props.organizationId}/documents/${props.id}`,
      ),
    list: (props: { organizationId: string }) =>
      makeRequest<{ documents: Document[] }>(`organizations/${props.organizationId}/documents`),
    search: (props: { organizationId: string; query: string }) =>
      makeRequest<{ documents: SearchResult[] }>(
        `organizations/${props.organizationId}/documents/search?searchQuery=${props.query}`,
      ),
  },
  organizations: {
    create: (props: { name: string }) =>
      makeRequest("organizations", {
        method: "POST",
        body: JSON.stringify(props),
      }),
    delete: (props: { id: string }) =>
      makeRequest(`organizations/${props.id}`, {
        method: "DELETE",
      }),
    list: () => makeRequest<{ organizations: Organization[] }>("organizations"),
  },
  tags: {
    create: (props: { organizationId: string; tag: Partial<Tag> }) =>
      makeRequest(`organizations/${props.organizationId}/tags`, {
        method: "POST",
        body: JSON.stringify(props.tag),
      }),
    delete: (props: { organizationId: string; id: string }) =>
      makeRequest(`organizations/${props.organizationId}/tags/${props.id}`, {
        method: "DELETE",
      }),
    list: (props: { organizationId: string }) =>
      makeRequest<{ tags: Tag[] }>(`organizations/${props.organizationId}/tags`),
  },
};
