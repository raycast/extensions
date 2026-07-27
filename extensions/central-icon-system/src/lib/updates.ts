/**
 * Detecting when installed icon data has fallen behind upstream.
 *
 * The manifests record the `@central-icons-react` version their geometry came
 * from, but nothing read it until now — so a user could sit on months-old data
 * with no signal. Upstream publishes near-daily (357 versions in ~15 months),
 * which makes silent drift the default outcome rather than an edge case.
 *
 * The registry lookup is the only network call the extension makes. It hits the
 * public npm registry — no license key, no icon geometry — and failure is
 * always silent: a missing update check must never interrupt someone who opened
 * the command to copy an icon.
 */

/** Registry metadata for one style package, narrowed to what we use. */
interface RegistryPacket {
  "dist-tags"?: { latest?: string };
}

export interface UpdateStatus {
  /** Version the installed manifests were built from. */
  installed: string;
  /** Latest published upstream, or null when the check failed. */
  latest: string | null;
  /** True only when both are known and differ. */
  outdated: boolean;
}

const REGISTRY = "https://registry.npmjs.org";
const SCOPE = "@central-icons-react";

/**
 * Ask the registry for a style's latest version.
 *
 * Every style in the scope is published in lockstep at the same version, so one
 * lookup answers for all of them.
 */
export async function fetchLatestVersion(style: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(`${REGISTRY}/${encodeURIComponent(`${SCOPE}/${style}`)}`, { signal });
    if (!response.ok) return null;
    const packet = (await response.json()) as RegistryPacket;
    return packet["dist-tags"]?.latest ?? null;
  } catch {
    // Offline, rate-limited, DNS-blocked — all the same to the caller. The
    // extension works fine without this; it just can't offer the nudge.
    return null;
  }
}

/**
 * Compare an installed version against upstream.
 *
 * Deliberately a string inequality rather than a semver comparison: any
 * difference means the local geometry no longer matches what upstream ships,
 * and "newer than latest" isn't a state worth modelling for a snapshot that was
 * copied from the registry in the first place.
 */
export function compareVersions(installed: string, latest: string | null): UpdateStatus {
  return { installed, latest, outdated: latest !== null && latest !== installed };
}
