import { logger } from "@chrismessina/raycast-logger";
import { siteFetch } from "../helpers/transport";
import { isRecord } from "../utils/is-record";
import type { CheckTarget, ProfileCheck } from "./types";

/**
 * Software that many sites run. A site on one of these answers the same API at its own origin, so one definition
 * gives every such site a reliable check and a username pattern: each Mastodon server, each Discourse forum.
 * Our take on social-analyzer's shared detections, written from each platform's public API.
 */
export type PlatformId = "mastodon" | "lemmy" | "discourse" | "gitlab" | "atproto";

interface PlatformDefinition {
  name: string;
  usernamePattern: string;
  /** The check for a site on this platform at `origin` */
  check: (origin: string) => ProfileCheck;
  /** A request that only this platform answers this way. Without one, the platform is only ever picked by hand. */
  fingerprint?: { path: string; matches: (body: unknown) => boolean };
}

export const PLATFORMS: Record<PlatformId, PlatformDefinition> = {
  mastodon: {
    // Also answered by Mastodon-compatible servers: GoToSocial, Pleroma, Akkoma
    name: "Mastodon",
    usernamePattern: "^[A-Za-z0-9_]+([.-]+[A-Za-z0-9_]+)*$",
    check: (origin) => ({
      signals: ["status"],
      method: "GET",
      probeUrl: `${origin}/api/v1/accounts/lookup?acct={profile}`,
    }),
    fingerprint: { path: "/api/v1/instance", matches: (body) => isRecord(body) && typeof body.uri === "string" },
  },
  lemmy: {
    name: "Lemmy",
    usernamePattern: "^[A-Za-z0-9_]+$",
    check: (origin) => ({ signals: ["status"], method: "GET", probeUrl: `${origin}/api/v3/user?username={profile}` }),
    fingerprint: { path: "/api/v3/site", matches: (body) => isRecord(body) && isRecord(body.site_view) },
  },
  discourse: {
    // Discourse can allow Unicode usernames, so only rule out what can't be in a URL path segment
    name: "Discourse",
    usernamePattern: "^[^\\s/?#]+$",
    check: (origin) => ({ signals: ["status"], method: "GET", probeUrl: `${origin}/u/{profile}.json` }),
    fingerprint: { path: "/site.json", matches: (body) => isRecord(body) && "default_archetype" in body },
  },
  atproto: {
    // Bluesky, Blacksky and every other app on the AT Protocol. Microcosm's Slingshot resolves a handle on any
    // server, checked both ways, where Bluesky's own API only knows accounts its app has indexed. An unknown handle
    // comes back as a 500 that says so. The web apps don't answer anything a site can be
    // recognized by, so this platform is picked by hand.
    name: "AT Protocol",
    usernamePattern: "^[A-Za-z0-9.-]+$",
    check: () => ({
      signals: ["status", "message"],
      method: "GET",
      probeUrl: "https://slingshot.microcosm.blue/xrpc/com.atproto.identity.resolveHandle?handle={profile}",
      notFoundText: ["Could not resolve handle"],
    }),
  },
  gitlab: {
    name: "GitLab",
    usernamePattern: "^[A-Za-z0-9_][A-Za-z0-9_.-]*$",
    // The users API answers 200 either way, with an empty list for nobody
    check: (origin) => ({
      signals: ["message"],
      probeUrl: `${origin}/api/v4/users?username={profile}`,
      notFoundBody: "[]",
    }),
    fingerprint: { path: "/api/v4/users?username=root", matches: (body) => Array.isArray(body) },
  },
};

const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && (PLATFORM_IDS as string[]).includes(value);
}

/**
 * Where a site's platform API lives: `https://social.example/@{profile}` → `https://social.example`. Unlike
 * getTemplateOrigin, which favicons use, this keeps every host label: platform sites never put the profile there.
 */
function siteOrigin(urlTemplate: string): string | undefined {
  try {
    return new URL(urlTemplate.replace(/{profile}/g, "x")).origin;
  } catch {
    return undefined;
  }
}

/**
 * What to check for a site on a platform. Opening the profile still uses the site's own template.
 */
export function platformTarget(id: PlatformId, urlTemplate: string): CheckTarget {
  const platform = PLATFORMS[id];
  const origin = siteOrigin(urlTemplate) ?? "";
  return { urlTemplate, check: platform.check(origin), usernamePattern: platform.usernamePattern };
}

const FINGERPRINT_TIMEOUT_MS = 6_000;

/**
 * Ask a site which platform it runs, by requesting every platform's fingerprint at once
 * @returns the platform, or undefined when the site answered and none matches
 * @throws when no request got an answer at all (offline, or the site is down), which says nothing about its platform
 */
export async function detectPlatform(
  urlTemplate: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<PlatformId | undefined> {
  const { fetchImpl = siteFetch, signal } = options;
  const origin = siteOrigin(urlTemplate);
  if (!origin) return undefined;

  const detectable = PLATFORM_IDS.filter((id) => PLATFORMS[id].fingerprint);
  let answered = false;
  const matches = await Promise.all(
    detectable.map(async (id) => {
      const { path, matches } = PLATFORMS[id].fingerprint!;
      try {
        const timeout = AbortSignal.timeout(FINGERPRINT_TIMEOUT_MS);
        const response = await fetchImpl(`${origin}${path}`, {
          headers: { Accept: "application/json" },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        answered = true;
        if (!response.ok) return false;
        return matches(JSON.parse(await response.text()));
      } catch {
        return false;
      }
    }),
  );
  const platform = detectable.find((_, index) => matches[index]);
  logger.log(`[Platform] ${origin}: ${platform ?? (answered ? "none" : "no answer")}`);
  if (!platform && !answered) throw new Error(`Couldn't reach ${new URL(origin).host}`);
  return platform;
}
