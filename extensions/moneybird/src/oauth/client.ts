import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const apiBaseUrl = "https://moneybird.com/api/v2";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Moneybird",
  providerIcon: "extension-icon.png",
  description: "Connect your Moneybird administration to Raycast and start registering time entries",
});

export const provider = new OAuthService({
  client,
  clientId: "ac9ad5e801c145dfa02732c8c62b1d8f",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/2QijvWZlCgJtKVzE9EG_mGx2DulRYvJQZlKC0cN8CwjSTccDV-mwsxiRx03lbj63Hl53CKRb5vi37PJ8AJMvarHholI5CvrGbIX7AeIIyoqcX-bAF2bnwnKGWzK-7EWxqJxog9aX4KD1lS_CyVONoOBVhhCIsTUpzeuusGMuDfD-H90",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/HkdQIb7W7JlFwNFCj2yL6zDPvJHb-vnTCrL_iPlT_K77Z-hQHyRJ-iiLSrkfjNta8Yys7_qRGKHBiAIVVt5GnqiV-VvvegeT9INJ24TrXTHk_P2MT0GOTd8fD9ogDuOgdPyMahi1mePSjhGKHTsBuPloYZFqNnDSzr4_ioxJBQ",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/66Tt7sCc6O70T4V3Rf_Dr4B941f08fkyizdDhimTODW0M7niNRllwvyk7FLX3XLaj0WNAWZBeOG1fZ8E1aTYWQR8ThljnyaUy3zS68Ocd5oxI6p4SUY7q2oIs_IauacmW75epq8Mn-mrdcpnmpuL19R7iPHgFy3FBS1ZeHRbSg",
  scope: "time_entries sales_invoices settings",
});

const fetchWithAuth = async (url: string, options?: RequestInit) => {
  const accessToken = await provider.authorize();

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  });
};

export const fetchData = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetchWithAuth(`${apiBaseUrl}/${path}`, options);
  return response.json();
};

const parseLinkHeader = (linkHeader: string | null) => {
  if (!linkHeader) return {};
  const links: Record<string, string> = {};
  const regex = /<([^>]+)>;\s*rel="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(linkHeader))) {
    const [, url, rel] = match;
    if (url && rel) links[rel] = url;
  }
  return links;
};

export const fetchPaginated = async <T>(path: string): Promise<T[]> => {
  const results: T[] = [];
  let nextUrl: URL | null = new URL(`${apiBaseUrl}/${path}`);
  nextUrl.searchParams.set("per_page", "100");
  if (!nextUrl.searchParams.get("page")) nextUrl.searchParams.set("page", "1");

  while (nextUrl) {
    const response = await fetchWithAuth(nextUrl.toString());
    const data = await response.json();
    if (Array.isArray(data)) results.push(...(data as T[]));

    const links = parseLinkHeader(response.headers.get("Link"));
    nextUrl = links.next ? new URL(links.next, apiBaseUrl) : null;
  }

  return results;
};
