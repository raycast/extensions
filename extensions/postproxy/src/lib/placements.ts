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

/** Merge raw platform-params JSON with per-network placement selections into the `platforms` object. */
export function buildPlatforms(
  rawJson: string,
  networkPlacements: Record<string, string>,
): Record<string, Record<string, unknown>> | undefined {
  let platforms: Record<string, Record<string, unknown>> = {};
  const trimmed = rawJson?.trim();
  if (trimmed && trimmed !== "{}") {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        platforms = parsed as Record<string, Record<string, unknown>>;
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
