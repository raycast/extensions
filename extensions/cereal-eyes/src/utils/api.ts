import { environment, getPreferenceValues } from "@raycast/api";
import type {
  ApiListResponse,
  ApiResponse,
  ContactSuggestions,
  Contact,
  Snippet,
  SnippetCreatePayload,
  SnippetShare,
  SnippetSharePayload,
} from "../types";
const PROD_BASE_URL = "https://cereal.email/api/v1";

// WARNING: This flag is process-wide — it disables TLS verification for ALL
// outgoing HTTPS requests in dev mode, not just requests to the local .test
// domain. Only use a local dev token that has no access to production data.
// Importing node:https to scope this per-request breaks Raycast's bundler.
if (environment.isDevelopment) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export function resolveCredentials(): {
  token: string;
  baseUrl: string;
  isMissingToken: boolean;
} {
  const prefs = getPreferenceValues<Preferences>();

  if (environment.isDevelopment) {
    const token = prefs.devApiToken ?? "";
    return {
      token,
      baseUrl: (prefs.devApiBaseUrl || PROD_BASE_URL).replace(/\/+$/, ""),
      isMissingToken: token.trim() === "",
    };
  }

  const token = prefs.apiToken ?? "";
  return {
    token,
    baseUrl: PROD_BASE_URL,
    isMissingToken: token.trim() === "",
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token, baseUrl } = resolveCredentials();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      error.message ?? `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Snippets
export async function getSnippets(
  visibility?: "public" | "private",
): Promise<ApiListResponse<Snippet>> {
  const params = visibility ? `?visibility=${visibility}` : "";
  return request<ApiListResponse<Snippet>>(`/snippets${params}`);
}

export async function getSnippet(id: string): Promise<ApiResponse<Snippet>> {
  return request<ApiResponse<Snippet>>(`/snippets/${id}`);
}

export async function createSnippet(
  payload: SnippetCreatePayload,
): Promise<ApiResponse<Snippet>> {
  return request<ApiResponse<Snippet>>("/snippets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSnippet(
  id: string,
  payload: Partial<SnippetCreatePayload>,
): Promise<ApiResponse<Snippet>> {
  return request<ApiResponse<Snippet>>(`/snippets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSnippet(id: string): Promise<void> {
  return request<void>(`/snippets/${id}`, { method: "DELETE" });
}

// Shares
export async function getShares(
  snippetId: string,
): Promise<ApiListResponse<SnippetShare>> {
  return request<ApiListResponse<SnippetShare>>(
    `/snippets/${snippetId}/shares`,
  );
}

export async function createShare(
  snippetId: string,
  payload: SnippetSharePayload,
): Promise<ApiResponse<SnippetShare>> {
  return request<ApiResponse<SnippetShare>>(`/snippets/${snippetId}/shares`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeShare(
  snippetId: string,
  shareId: string,
): Promise<void> {
  return request<void>(`/snippets/${snippetId}/shares/${shareId}`, {
    method: "DELETE",
  });
}

// Contacts
export async function getContacts(
  search?: string,
): Promise<ApiListResponse<Contact>> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<ApiListResponse<Contact>>(`/contacts${params}`);
}

export async function getShareContactSuggestions(): Promise<
  ApiResponse<ContactSuggestions>
> {
  return request<ApiResponse<ContactSuggestions>>(
    "/share-contacts/suggestions",
  );
}
