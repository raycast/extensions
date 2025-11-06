import { getPreferenceValues } from "@raycast/api";
import { Document, ErrorResult, Organization, Tag } from "./types";

const { papra_url, api_token } = getPreferenceValues<Preferences>();
const API_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${api_token}`,
  "Content-Type": "application/json",
};

export const PAPRA_COLOR = "#d9ff7a";

export const buildPapraUrl = (route: string) => new URL(route, papra_url);

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const url = buildPapraUrl(`api/${endpoint}`);
  if (url.hostname === "dashboard.papra.app") url.hostname = "api.papra.app";
  const response = await fetch(url, {
    ...options,
    headers: API_HEADERS,
  });
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Unknown Error");
  if (response.status===204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error((result as ErrorResult).error.message);
  return result as T;
};
export const papra = {
  documents: {
    list: (props: { organizationId: string }) =>
      makeRequest<{ documents: Document[] }>(`organizations/${props.organizationId}/documents`),
  },
  organizations: {
      create: (props: { name: string }) =>
        makeRequest("organizations", {
            method: "POST",
            body: JSON.stringify(props),
        }),
        delete: (props: {id: string}) => makeRequest(`organizations/${props.id}`, {
            method: "DELETE"
        }),
        list: () => makeRequest<{ organizations: Organization[] }>("organizations"),
    },
    tags: {
        create: (props: {organizationId: string, tag: Partial<Tag> }) =>
          makeRequest(`organizations/${props.organizationId}/tags`, {
              method: "POST",
              body: JSON.stringify(props.tag),
          }),
      list: (props: { organizationId: string }) =>
        makeRequest<{ tags: Tag[] }>(`organizations/${props.organizationId}/tags`),
    },
};
