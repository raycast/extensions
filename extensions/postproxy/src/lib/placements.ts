import { api, authHeaders, normalizeList } from "./postproxy";
import type { Placement, Profile } from "./types";

/** Networks that support a "placement" (which page / org / board / channel to post to). */
export const PLACEMENT_META: Record<string, { key: string; label: string }> = {
  facebook: { key: "page_id", label: "Facebook Page" },
  linkedin: { key: "organization_id", label: "LinkedIn Organization" },
  pinterest: { key: "board_id", label: "Pinterest Board" },
  telegram: { key: "chat_id", label: "Telegram Channel" },
};

export function supportsPlacements(platform: string | undefined): boolean {
  return Boolean(PLACEMENT_META[(platform ?? "").toLowerCase()]);
}

function placementNetworkCounts(profiles: Profile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const profile of profiles) {
    if (!supportsPlacements(profile.platform)) continue;
    const net = profile.platform.toLowerCase();
    counts[net] = (counts[net] ?? 0) + 1;
  }
  return counts;
}

/**
 * Placements are per-network in the API (one `page_id`/`board_id`/… for the whole network), so a
 * placement is only unambiguous when a single selected profile is on that network. Returns the
 * placement-supporting profiles whose network has exactly one selected profile.
 */
export function eligiblePlacementProfiles(profiles: Profile[]): Profile[] {
  const counts = placementNetworkCounts(profiles);
  return profiles.filter((p) => supportsPlacements(p.platform) && counts[p.platform.toLowerCase()] === 1);
}

/** Networks with 2+ selected profiles — placements can't be applied unambiguously for these. */
export function ambiguousPlacementNetworks(profiles: Profile[]): string[] {
  const counts = placementNetworkCounts(profiles);
  return Object.keys(counts).filter((net) => counts[net] > 1);
}

/** Fetch placements for the given profiles, merged & de-duped by network. */
export async function loadPlacementsByNetwork(profiles: Profile[]): Promise<Record<string, Placement[]>> {
  const byNetwork: Record<string, Placement[]> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      try {
        const response = await fetch(api(`/profiles/${profile.id}/placements`), { headers: authHeaders() });
        if (!response.ok) return;
        const items = normalizeList<Placement>(await response.json());
        if (items.length === 0) return;
        const net = profile.platform.toLowerCase();
        const list = byNetwork[net] ?? (byNetwork[net] = []);
        // Keep null-id placements (e.g. LinkedIn "Personal Profile"); de-dupe by id or name.
        for (const item of items) {
          const key = item.id ?? item.name;
          if (!list.some((p) => (p.id ?? p.name) === key)) list.push(item);
        }
      } catch {
        // ignore per-profile failures
      }
    }),
  );
  return byNetwork;
}

/** LinkedIn's placement is optional (defaults to the personal profile); the others are mandatory. */
const OPTIONAL_PLACEMENT_NETWORKS = new Set(["linkedin"]);

/** True when the network mandates a placement (publishing fails without one). */
export function requiresPlacement(platform: string | undefined): boolean {
  const net = (platform ?? "").toLowerCase();
  return Boolean(PLACEMENT_META[net]) && !OPTIONAL_PLACEMENT_NETWORKS.has(net);
}

export type ResolvedPlacements = { ok: true; placements: Record<string, string> } | { ok: false; message: string };

/**
 * Resolve a valid placement id per network for the given (single-profile-per-network) profiles,
 * fetched fresh at call time. Returns a user-facing error instead of guessing when a mandatory
 * placement can't be loaded (failed/empty request) or the chosen one is no longer valid — so a post
 * is never published to a destination the user didn't select, or without a required placement.
 */
export async function resolvePlacements(
  eligibleProfiles: Profile[],
  chosenByNetwork: Record<string, string>,
): Promise<ResolvedPlacements> {
  const placements: Record<string, string> = {};
  for (const profile of eligibleProfiles) {
    const net = profile.platform.toLowerCase();
    const meta = PLACEMENT_META[net];
    if (!meta) continue;
    const optional = OPTIONAL_PLACEMENT_NETWORKS.has(net);

    let list: Placement[] | null = null;
    try {
      const response = await fetch(api(`/profiles/${profile.id}/placements`), { headers: authHeaders() });
      if (response.ok) list = normalizeList<Placement>(await response.json());
    } catch {
      list = null;
    }

    if (list === null) {
      if (optional) {
        placements[net] = "";
        continue;
      }
      return { ok: false, message: `Couldn't load ${meta.label} options — check your connection and try again.` };
    }
    if (list.length === 0) {
      if (optional) {
        placements[net] = "";
        continue;
      }
      return { ok: false, message: `No ${meta.label} is available for the selected profile.` };
    }

    const validIds = new Set(list.map((placement) => placement.id ?? ""));
    const chosen = chosenByNetwork[net];
    if (chosen !== undefined && validIds.has(chosen)) {
      placements[net] = chosen;
    } else if (optional) {
      placements[net] = "";
    } else {
      return { ok: false, message: `Choose a ${meta.label} and try again.` };
    }
  }
  return { ok: true, placements };
}

/** Merge raw platform-params JSON with per-network placement selections into the `platforms` object. */
export function buildPlatforms(
  rawJson: string,
  networkPlacements: Record<string, string>,
): Record<string, Record<string, unknown>> | undefined {
  const platforms: Record<string, Record<string, unknown>> = {};
  const trimmed = rawJson?.trim();
  if (trimmed && trimmed !== "{}") {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // Only keep platform entries whose value is itself a JSON object.
        for (const [net, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            platforms[net] = { ...(value as Record<string, unknown>) };
          }
        }
      }
    } catch {
      // form validation blocks submit on invalid JSON; ignore here
    }
  }
  for (const [net, placementId] of Object.entries(networkPlacements)) {
    if (!placementId) continue;
    const meta = PLACEMENT_META[net];
    if (!meta) continue;
    platforms[net] = { ...(platforms[net] ?? {}), [meta.key]: placementId };
  }
  return Object.keys(platforms).length > 0 ? platforms : undefined;
}
