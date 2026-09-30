import { Cache } from "@raycast/api";

export const SNAPTRADE_ISSUER = "https://api.snaptrade.com";
// Canonical root paths (e.g. /accounts). The old /api/v1 prefix still works but is marked deprecated.
export const SNAPTRADE_API_BASE = "https://api.snaptrade.com";
const DISCOVERY_URL = `${SNAPTRADE_ISSUER}/.well-known/oauth-authorization-server`;
const CACHE_KEY = "oauth-discovery-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface OAuthDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
}

/** Last known-good values, used only if the discovery document can't be fetched. */
const FALLBACK: OAuthDiscovery = {
  issuer: SNAPTRADE_ISSUER,
  authorization_endpoint: "https://dashboard.snaptrade.com/oauth/authorize",
  token_endpoint: "https://api.snaptrade.com/oauth/token/",
  revocation_endpoint: "https://api.snaptrade.com/oauth/revoke_token/",
  scopes_supported: ["openid", "profile", "email", "read"],
  code_challenge_methods_supported: ["S256"],
};

const cache = new Cache({ namespace: "folio-discovery" });

function isValid(doc: unknown): doc is OAuthDiscovery {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  return (
    typeof d.authorization_endpoint === "string" &&
    d.authorization_endpoint.startsWith("https://") &&
    typeof d.token_endpoint === "string" &&
    d.token_endpoint.startsWith("https://")
  );
}

export async function getDiscovery(): Promise<OAuthDiscovery> {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      const { at, doc } = JSON.parse(cached) as { at: number; doc: OAuthDiscovery };
      if (Date.now() - at < CACHE_TTL_MS && isValid(doc)) return doc;
    } catch {
      // fall through to refetch
    }
  }
  try {
    const res = await fetch(DISCOVERY_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`discovery ${res.status}`);
    const doc = (await res.json()) as unknown;
    if (!isValid(doc) || doc.issuer !== SNAPTRADE_ISSUER) throw new Error("discovery document failed validation");
    cache.set(CACHE_KEY, JSON.stringify({ at: Date.now(), doc }));
    return doc;
  } catch {
    return FALLBACK;
  }
}
