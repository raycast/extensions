import { providerError, type ProviderErrorSurface } from "./providerError";
import type { ProviderId } from "./providers/types";

/**
 * Resolution and validation for the user-configurable API server URL, shared
 * by every provider.
 *
 * Gemini: the documented form is a server or gateway root. For compatibility
 * with other Gemini clients, versioned roots and complete models-collection
 * URLs are accepted too; every form resolves to one canonical models URL.
 *
 * Anthropic and OpenAI-style providers: a bare origin gets `/v1`; any other
 * path is used as given, because compatible servers mount the API under
 * their own prefixes (`/api/v1`, `/v1beta/openai`, ...).
 *
 * The endpoint is user-controlled but the API key is not: it travels to
 * whatever host is configured. Plaintext `http` is therefore accepted only for
 * true loopback, where the request never reaches a network interface.
 */

// Why these are not package.json defaults: AGENTS.md → Providers → Defaults.
const DEFAULT_BASE_URLS: Record<ProviderId, string | undefined> = {
  gemini: "https://generativelanguage.googleapis.com",
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  "openai-compatible": undefined,
};

// `new URL("http://[::1]:4000").hostname` keeps the brackets — matching without
// them silently rejects IPv6 loopback. `0.0.0.0` is the bind address local
// proxies are usually started with, and users type back what they bound; as a
// destination the kernel routes it to this host, so the request stays local.
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);
const VERSIONED_MODELS_PATH = /\/(?:v1|v1beta)\/models$/u;
const VERSIONED_API_PATH = /\/(?:v1|v1beta)$/u;

function normalize(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function isAllowedOrigin(url: URL): boolean {
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && LOOPBACK_HOSTNAMES.has(url.hostname);
}

function toGeminiModelsBaseUrl(candidate: string, url: URL): string {
  if (VERSIONED_MODELS_PATH.test(url.pathname)) return candidate;
  if (VERSIONED_API_PATH.test(url.pathname)) return `${candidate}/models`;
  return `${candidate}/v1beta/models`;
}

function toVersionedApiBaseUrl(candidate: string, url: URL): string {
  return url.pathname === "" || url.pathname === "/" ? `${candidate}/v1` : candidate;
}

/**
 * Normalize and validate the configured server URL, falling back to the
 * provider's default when the preference is empty. Returns the prefix the
 * provider's resource paths are appended to. Throws `invalid-base-url` rather
 * than returning a sentinel so a misconfigured endpoint can never reach `fetch`.
 */
export function resolveBaseUrl(raw: string | undefined, provider: ProviderId, surface: ProviderErrorSurface): string {
  const invalid = () => providerError({ domain: "infrastructure", kind: "invalid-base-url", surface, provider });
  const fallback = DEFAULT_BASE_URLS[provider];
  const candidate = normalize(raw ?? "") || (fallback && normalize(fallback));
  if (!candidate) throw invalid();

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw invalid();
  }

  if (!isAllowedOrigin(url)) throw invalid();

  // Node's fetch rejects credential-bearing URLs before issuing a request.
  // Reject them here so translation reports the configured URL honestly and
  // TTS cannot misclassify the TypeError as an offline failure and fall back.
  if (url.username || url.password) throw invalid();

  // A query string or fragment makes appending the resource path unsafe.
  // `?key=…` is the shape Google's older snippets use, so it is a likely paste —
  // and it puts a secret in a URL. Tested on the raw string because a trailing
  // `?` parses to an empty search but still changes string concatenation.
  if (candidate.includes("?") || candidate.includes("#")) throw invalid();

  return provider === "gemini" ? toGeminiModelsBaseUrl(candidate, url) : toVersionedApiBaseUrl(candidate, url);
}

/**
 * Host to name when a request to a user-configured endpoint fails ambiguously.
 * `undefined` for the provider's default, which keeps the error copy unchanged
 * for installs that never touched the preference. Built from `hostForLog`, so
 * no path or userinfo can reach user-visible text.
 */
export function customEndpointHost(resolvedBaseUrl: string, provider: ProviderId): string | undefined {
  const fallback = DEFAULT_BASE_URLS[provider];
  if (fallback && resolvedBaseUrl === resolveBaseUrl(fallback, provider, "translate")) return undefined;
  return hostForLog(resolvedBaseUrl);
}

/**
 * Host for structured logs. `URL.host` drops the path and any `user:pass@`
 * userinfo, so a credential embedded in either cannot reach the log.
 */
export function hostForLog(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "invalid";
  }
}
