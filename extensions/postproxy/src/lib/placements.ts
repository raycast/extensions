import { api, authHeaders, normalizeList } from "./postproxy";
import type { Placement, Profile } from "./types";

/**
 * Networks that support a "placement" — which page / organization / board / channel / location a post
 * targets. Per the API a placement is ONE shared value for the whole network in a single post
 * (`platforms.<network>.<key>`), so it can only be applied when a single profile of that network is
 * in the post. See https://postproxy.dev/reference/platforms/*#placements.
 */
export const PLACEMENT_META: Record<string, { key: string; label: string }> = {
  facebook: { key: "page_id", label: "Facebook Page" },
  linkedin: { key: "organization_id", label: "LinkedIn Organization" },
  pinterest: { key: "board_id", label: "Pinterest Board" },
  telegram: { key: "chat_id", label: "Telegram Channel" },
  google_business: { key: "location_id", label: "Google Business Location" },
};

/** LinkedIn's placement is optional (omit → personal profile); the others are mandatory. */
const OPTIONAL_PLACEMENT_NETWORKS = new Set(["linkedin"]);

export function supportsPlacements(platform: string | undefined): boolean {
  return Boolean(PLACEMENT_META[(platform ?? "").toLowerCase()]);
}

/** True when the network mandates a placement (publishing fails without one). */
export function requiresPlacement(platform: string | undefined): boolean {
  const net = (platform ?? "").toLowerCase();
  return Boolean(PLACEMENT_META[net]) && !OPTIONAL_PLACEMENT_NETWORKS.has(net);
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

/** Placement-supporting profiles whose network has exactly one selected profile (dropdown-eligible). */
export function eligiblePlacementProfiles(profiles: Profile[]): Profile[] {
  const counts = placementNetworkCounts(profiles);
  return profiles.filter((p) => supportsPlacements(p.platform) && counts[p.platform.toLowerCase()] === 1);
}

/** Mandatory-placement networks with 2+ selected profiles — can't be published together (UI note). */
export function overSelectedMandatoryNetworks(profiles: Profile[]): string[] {
  const counts = placementNetworkCounts(profiles);
  return Object.keys(counts).filter((net) => counts[net] > 1 && requiresPlacement(net));
}

/** Fetch placements for the given profiles, merged & de-duped by network (for the pickers). */
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

/**
 * The single validation choke point: check the FINAL platforms payload (dropdown + raw JSON merged)
 * against the selection. A placement is one shared value per network per post, so:
 *  - it may only be sent when exactly one profile of that network is selected;
 *  - mandatory networks additionally require it.
 * Returns a user-facing error message, or null when the payload is safe to publish.
 */
export function validatePlacementPayload(
  platforms: Record<string, Record<string, unknown>> | undefined,
  selectedProfiles: Profile[],
): string | null {
  const counts = placementNetworkCounts(selectedProfiles);
  for (const [net, meta] of Object.entries(PLACEMENT_META)) {
    const count = counts[net] ?? 0;
    if (count === 0) continue;
    const hasPlacement = Boolean(platforms?.[net]?.[meta.key]);
    if (count > 1) {
      if (hasPlacement) {
        return `${meta.label}: a placement can't be shared across multiple profiles. Select a single profile on this network, or publish them in separate posts.`;
      }
      if (requiresPlacement(net)) {
        return `${meta.label}: multiple profiles are selected and each needs its own placement. Publish them in separate posts.`;
      }
    } else if (requiresPlacement(net) && !hasPlacement) {
      return `Choose a ${meta.label} to publish.`;
    }
  }
  return null;
}
