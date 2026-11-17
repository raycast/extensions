import type { StoreApp, StoreOrganization } from "./types";
import {
  getStoreAccessToken,
  hasStoreSession,
  StoreSignInRequired,
} from "./store-auth";
import type { StoreSort } from "./store-filters";
import { parseStoreApps, parseStoreOrganizations } from "./store-response";

const API_URL = "https://api.glaze.app";

async function storeRequest(
  url: URL,
  authenticated: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authenticated)
    headers.Authorization = `Bearer ${await getStoreAccessToken()}`;
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 && authenticated) throw new StoreSignInRequired();
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "This account does not have access to that store. Choose another store or sign in with your Glaze account."
        : `Glaze Store request failed (${response.status}). Try again shortly.`,
    );
  }
  return response;
}

export async function listStoreAccess(): Promise<{
  signedIn: boolean;
  organizations: StoreOrganization[];
}> {
  if (!(await hasStoreSession())) return { signedIn: false, organizations: [] };
  const response = await storeRequest(
    new URL(`${API_URL}/api/organizations`),
    true,
  );
  return {
    signedIn: true,
    organizations: parseStoreOrganizations(await response.json()),
  };
}

export async function searchStoreApps(
  query: string,
  category: string,
  organizationId: string,
  sort: StoreSort,
  page = 0,
): Promise<{ data: StoreApp[]; hasMore: boolean }> {
  const authenticated = organizationId !== "public";
  const url = new URL(
    `${API_URL}/${authenticated ? "api" : "public_api"}/apps`,
  );
  url.search = new URLSearchParams({
    query,
    limit: "50",
    offset: String(page * 50),
    sort,
  }).toString();
  if (category) url.searchParams.set("category", category);
  if (authenticated) {
    url.searchParams.set("organizationId", organizationId);
    url.searchParams.set("visibility", "organization");
  }
  const response = await storeRequest(url, authenticated);
  return parseStoreApps(await response.json());
}
