import { getPreferenceValues, LocalStorage } from "@raycast/api";

import type {
  IpAddress,
  SearchResults,
  Section,
  Subnet,
  SubnetUsage,
  Vlan,
  Vrf,
} from "./types";

interface ApiEnvelope<T> {
  code?: number;
  success?: boolean;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  readonly code: number;

  constructor(message: string, code = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const TOKEN_KEY = "phpipam_token";
const EXPIRY_KEY = "phpipam_token_expires";
const SCOPE_KEY = "phpipam_token_scope";

/**
 * A cached token is only valid for the instance, API app and user it was
 * issued for; anything else must re-authenticate instead of sending a live
 * token from a previous setup to the current URL.
 */
function tokenScope(): string {
  return [
    webBaseUrl(),
    preferences.appId.trim(),
    preferences.username ?? "",
  ].join("|");
}

/** Re-authenticate well before the server-side expiry to avoid clock drift. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

export const preferences = getPreferenceValues<Preferences>();

// phpipam commonly runs behind internally-signed TLS in labs.
if (preferences.ignoreTlsErrors) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export function webBaseUrl(): string {
  return preferences.phpipamUrl.trim().replace(/\/+$/, "");
}

function apiUrl(): string {
  const base = webBaseUrl();
  // Login sends reusable credentials and every request carries the token, so
  // plain http:// must be an explicit opt-in, not a silent fallback.
  if (/^http:\/\//i.test(base) && !preferences.allowHttp) {
    throw new ApiError(
      'The phpIPAM URL uses unencrypted http:// — enable "Allow Unencrypted (HTTP) Connections" in the extension preferences (trusted internal networks only), or use an https:// URL.',
      400,
    );
  }
  return `${base}/api/${encodeURIComponent(preferences.appId.trim())}`;
}

/** phpIPAM's API management page (Administration → API). */
export function apiSettingsUrl(): string {
  return `${webBaseUrl()}/index.php?page=administration&subnetId=api`;
}

/**
 * phpIPAM expires tokens with a sliding window and stores them per user, so
 * concurrent requests must share one authentication attempt.
 */
let inflightAuth: Promise<string> | null = null;

async function authenticate(): Promise<string> {
  const username = preferences.username?.trim() ?? "";
  const password = preferences.password ?? "";
  if (!username || !password) {
    throw new ApiError(
      'No credentials set — fill "Username" and "Password" in the extension preferences (a local phpIPAM user), or set an "API App Code" for apps with "SSL with App code" security.',
      400,
    );
  }
  const basic = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(`${apiUrl()}/user/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<{
    token: string;
    expires: string;
  }> | null;
  const token = typeof body?.data?.token === "string" ? body.data.token : "";
  if (!res.ok || !token) {
    if (res.redirected) {
      throw new ApiError(
        `The phpIPAM URL redirected this request to ${res.url} — Authorization headers are dropped on redirects. Set the preference to the final URL (usually https://…).`,
        res.status,
      );
    }
    if (/please provide username and password/i.test(body?.message ?? "")) {
      throw new ApiError(
        'phpIPAM received no credentials — the web server drops the Authorization header before it reaches PHP. Fixes by setup: nginx/php-fpm → add "fastcgi_pass_header Authorization;" to the PHP location block; Apache with PHP-FPM/CGI → add "CGIPassAuth On" (or "SetEnvIf Authorization \'(.*)\' HTTP_AUTHORIZATION=$1") to the vhost/.htaccess; also check for "RequestHeader unset Authorization" in the config. Apache mod_php needs no extra config.',
        res.status,
      );
    }
    throw new ApiError(
      body?.message ??
        `Authentication failed (HTTP ${res.status}). Check URL, app ID and credentials.`,
      res.status,
    );
  }
  const expires =
    body && typeof body.data?.expires === "string" ? body.data.expires : "";
  await LocalStorage.setItem(TOKEN_KEY, token);
  await LocalStorage.setItem(EXPIRY_KEY, expires);
  await LocalStorage.setItem(SCOPE_KEY, tokenScope());
  return token;
}

function parseExpiry(raw: string | undefined): number {
  if (!raw) return 0;
  // phpIPAM returns "Y-m-d H:i:s" without a timezone; treat it as local time.
  const parsed = new Date(raw.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

async function getToken(force = false): Promise<string> {
  // ssl_code security: the app code itself is the token (api/index.php →
  // check_auth_code), no user authentication happens.
  const appCode = preferences.appCode?.trim();
  if (appCode) {
    return appCode;
  }
  if (!force) {
    const [token, expiry, scope] = await Promise.all([
      LocalStorage.getItem(TOKEN_KEY),
      LocalStorage.getItem(EXPIRY_KEY),
      LocalStorage.getItem(SCOPE_KEY),
    ]);
    if (scope !== tokenScope()) {
      await Promise.all([
        LocalStorage.removeItem(TOKEN_KEY),
        LocalStorage.removeItem(EXPIRY_KEY),
        LocalStorage.removeItem(SCOPE_KEY),
      ]);
    } else if (
      typeof token === "string" &&
      token &&
      parseExpiry(typeof expiry === "string" ? expiry : "") - Date.now() >
        EXPIRY_MARGIN_MS
    ) {
      return token;
    }
  }
  if (!inflightAuth) {
    inflightAuth = authenticate().finally(() => {
      inflightAuth = null;
    });
  }
  return inflightAuth;
}

async function apiGet<T>(path: string, retry = true): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${apiUrl()}/${path}`, {
    headers: {
      Accept: "application/json",
      // User.php accepts the plain "token" header, other controllers use
      // "phpipam-token"; send both.
      token: token,
      "phpipam-token": token,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || body?.success === false) {
    const code = body?.code ?? res.status;
    if (retry && (code === 401 || code === 403)) {
      // Token expired or replaced elsewhere: authenticate once more, then retry.
      const freshToken = await getToken(true);
      const retryRes = await fetch(`${apiUrl()}/${path}`, {
        headers: {
          Accept: "application/json",
          token: freshToken,
          "phpipam-token": freshToken,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const retryBody = (await retryRes
        .json()
        .catch(() => null)) as ApiEnvelope<T> | null;
      if (!retryRes.ok || retryBody?.success === false) {
        throw new ApiError(
          retryBody?.message ?? `Request failed (HTTP ${retryRes.status})`,
          retryBody?.code ?? retryRes.status,
        );
      }
      return (retryBody?.data ?? (retryBody as unknown)) as T;
    }
    throw new ApiError(
      body?.message ?? `Request failed (HTTP ${res.status})`,
      code,
    );
  }
  return (body?.data ?? (body as unknown)) as T;
}

function collect<T>(envelope: ApiEnvelope<unknown> | undefined): T[] {
  return Array.isArray(envelope?.data) ? (envelope.data as T[]) : [];
}

export const phpipam = {
  async sections(): Promise<Section[]> {
    return apiGet<Section[]>("sections/");
  },

  /** Subnets of a section, enriched with usage statistics by the API. */
  async sectionSubnets(sectionId: string): Promise<Subnet[]> {
    return apiGet<Subnet[]>(
      `sections/${encodeURIComponent(sectionId)}/subnets/`,
    );
  },

  async allSubnets(): Promise<Subnet[]> {
    return apiGet<Subnet[]>("subnets/");
  },

  async subnet(subnetId: string): Promise<Subnet> {
    return apiGet<Subnet>(`subnets/${encodeURIComponent(subnetId)}/`);
  },

  async subnetUsage(subnetId: string): Promise<SubnetUsage> {
    return apiGet<SubnetUsage>(
      `subnets/${encodeURIComponent(subnetId)}/usage/`,
    );
  },

  async subnetAddresses(subnetId: string): Promise<IpAddress[]> {
    return apiGet<IpAddress[]>(
      `subnets/${encodeURIComponent(subnetId)}/addresses/`,
    );
  },

  /** First free address of a subnet, or null when the subnet is full. */
  async firstFreeAddress(subnetId: string): Promise<string | null> {
    try {
      return await apiGet<string>(
        `subnets/${encodeURIComponent(subnetId)}/first_free/`,
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === 404 || error.code === 503)
      )
        return null;
      throw error;
    }
  },

  async search(term: string): Promise<SearchResults> {
    const raw = await apiGet<Record<string, ApiEnvelope<unknown>>>(
      `search/${encodeURIComponent(term)}/?subnets=1&addresses=1&vlan=1&vrf=1`,
    );
    return {
      subnets: collect<Subnet>(raw.subnets),
      addresses: collect<IpAddress>(raw.addresses),
      vlans: collect<Vlan>(raw.vlan),
      vrfs: collect<Vrf>(raw.vrf),
    };
  },
};
