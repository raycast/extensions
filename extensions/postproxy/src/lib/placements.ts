import { normalizeList, request } from "./postproxy";
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

/** Every known placement key — used to reject a placement key placed under the wrong network. */
const PLACEMENT_KEYS = new Set(Object.values(PLACEMENT_META).map((m) => m.key));

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

/**
 * Fetch placements for the given profiles, merged & de-duped by network (for the pickers). Keeps
 * partial results and collects per-profile failures so the caller can warn + offer a retry instead of
 * silently rendering no dropdown (which would strand a mandatory network at submit time).
 */
export async function loadPlacementsByNetwork(
  profiles: Profile[],
): Promise<{ byNetwork: Record<string, Placement[]>; errors: Error[] }> {
  const byNetwork: Record<string, Placement[]> = {};
  const errors: Error[] = [];
  await Promise.all(
    profiles.map(async (profile) => {
      try {
        const items = normalizeList<Placement>(await request("GET", `/profiles/${profile.id}/placements`));
        const net = profile.platform.toLowerCase();
        // Record the network even when the (successful) response is empty, so an empty result is
        // distinguishable from a fetch failure (both were previously just "absent"). This lets the
        // reconciliation effect clear a now-stale selection and lets the picker still render (e.g. a
        // LinkedIn "Personal Profile" option) instead of silently vanishing.
        const list = byNetwork[net] ?? (byNetwork[net] = []);
        // Keep null-id placements (e.g. LinkedIn "Personal Profile"); de-dupe by id or name.
        for (const item of items) {
          const key = item.id ?? item.name;
          if (!list.some((p) => (p.id ?? p.name) === key)) list.push(item);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }),
  );
  return { byNetwork, errors };
}

/**
 * Merge raw platform-params JSON with the per-network dropdown selections into the `platforms` object.
 * A dropdown selection is only applied for a network that is currently eligible (exactly one profile of
 * that network is selected). This prevents a stale selection — left over after the profile was
 * deselected or a second one was added before the pickers refreshed — from leaking into the payload.
 * Raw JSON is applied as-is (the user's explicit override) and validated separately.
 */
export function buildPlatforms(
  rawJson: string,
  networkPlacements: Record<string, string>,
  eligibleNetworks: Set<string>,
): Record<string, Record<string, unknown>> | undefined {
  const platforms: Record<string, Record<string, unknown>> = {};
  const trimmed = rawJson?.trim();
  if (trimmed && trimmed !== "{}") {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // Only keep platform entries whose value is itself a JSON object. Canonicalize a known
        // placement network's key to lowercase so a mis-cased key (e.g. "LinkedIn") can't slip a
        // placement past validation, which looks it up by the lowercase network name.
        for (const [rawNet, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            const net = PLACEMENT_META[rawNet.toLowerCase()] ? rawNet.toLowerCase() : rawNet;
            platforms[net] = { ...(platforms[net] ?? {}), ...(value as Record<string, unknown>) };
          }
        }
      }
    } catch {
      // form validation blocks submit on invalid JSON; ignore here
    }
  }
  // For an eligible network the dropdown is the authoritative placement control, so its value overrides
  // any raw-JSON placement for that network: a chosen id is sent, and an explicit Personal/none ("")
  // clears a raw organization_id/page_id/etc. — so what the user sees selected is what gets sent.
  for (const net of eligibleNetworks) {
    const meta = PLACEMENT_META[net];
    if (!meta) continue;
    // Tri-state, so the dropdown only overrides raw JSON once the user has actually used it:
    //  - untouched (no own key): leave any raw placement to stand;
    //  - explicit Personal/none (own key ""): clear a raw placement;
    //  - chosen id (own key, nonempty): override raw.
    if (!Object.prototype.hasOwnProperty.call(networkPlacements, net)) continue;
    const selection = networkPlacements[net];
    if (selection) {
      platforms[net] = { ...(platforms[net] ?? {}), [meta.key]: selection };
    } else if (platforms[net] && meta.key in platforms[net]) {
      const rest = { ...platforms[net] };
      delete rest[meta.key];
      if (Object.keys(rest).length > 0) platforms[net] = rest;
      else delete platforms[net];
    }
  }
  return Object.keys(platforms).length > 0 ? platforms : undefined;
}

/** The placement networks currently eligible for a dropdown selection (exactly one profile selected). */
export function eligiblePlacementNetworks(profiles: Profile[]): Set<string> {
  return new Set(eligiblePlacementProfiles(profiles).map((p) => p.platform.toLowerCase()));
}

/**
 * Placement ids specified directly in raw Platform Parameters JSON, keyed by canonical network. Lets an
 * untouched dropdown display the raw-controlled placement, so the picker reflects what will be sent.
 */
export function rawPlacementIds(rawJson: string): Record<string, string> {
  const ids: Record<string, string> = {};
  const trimmed = rawJson?.trim();
  if (!trimmed || trimmed === "{}") return ids;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [rawNet, value] of Object.entries(parsed as Record<string, unknown>)) {
        const meta = PLACEMENT_META[rawNet.toLowerCase()];
        if (!meta || !value || typeof value !== "object" || Array.isArray(value)) continue;
        const id = (value as Record<string, unknown>)[meta.key];
        if (typeof id === "string" && id) ids[rawNet.toLowerCase()] = id;
      }
    }
  } catch {
    // invalid JSON is blocked by form validation
  }
  return ids;
}

/**
 * The single validation choke point, run at submit time over the FINAL platforms payload (dropdown +
 * raw JSON merged). A placement is one shared value per network per post, so:
 *  - it may only be sent when exactly one profile of that network is selected;
 *  - mandatory networks must have one;
 *  - the sent id must belong to the CURRENTLY selected profile — re-fetched fresh, so a stale
 *    selection (e.g. swapping the profile for another on the same network), an out-of-order load, or
 *    a hand-typed raw-JSON id can't target a page/board/org/channel/location the user didn't pick.
 * Returns a user-facing error message, or null when the payload is safe to publish.
 */
export async function validatePlacements(
  platforms: Record<string, Record<string, unknown>> | undefined,
  selectedProfiles: Profile[],
): Promise<string | null> {
  const counts = placementNetworkCounts(selectedProfiles);

  // Reject a known placement key placed under the wrong network in raw JSON (e.g. page_id under
  // "instagram"), which would otherwise reach createPost unvalidated.
  for (const [net, params] of Object.entries(platforms ?? {})) {
    const ownKey = PLACEMENT_META[net]?.key;
    for (const key of Object.keys(params)) {
      if (PLACEMENT_KEYS.has(key) && key !== ownKey) {
        return `Platform Parameters: "${key}" is not a placement for ${net} — remove it or move it to the matching network.`;
      }
    }
  }

  // Re-fetch the valid placements for each single-profile network, tracking failures per network so a
  // request outage is reported as the real error rather than a misleading "choose a placement".
  const validByNetwork: Record<string, Set<string>> = {};
  const failedByNetwork: Record<string, Error> = {};
  await Promise.all(
    eligiblePlacementProfiles(selectedProfiles).map(async (profile) => {
      const net = profile.platform.toLowerCase();
      try {
        const list = normalizeList<Placement>(await request("GET", `/profiles/${profile.id}/placements`));
        const set = validByNetwork[net] ?? (validByNetwork[net] = new Set<string>());
        for (const placement of list) set.add(placement.id ?? "");
      } catch (error) {
        failedByNetwork[net] = error instanceof Error ? error : new Error(String(error));
      }
    }),
  );

  for (const [net, meta] of Object.entries(PLACEMENT_META)) {
    const count = counts[net] ?? 0;
    const sentId = platforms?.[net]?.[meta.key];
    const hasPlacement = sentId != null && sentId !== "";

    // A placement id must be a plain string; validation compares as a string but createPost sends the
    // original value, so a raw-JSON number/array would otherwise validate yet be sent as a non-string.
    if (hasPlacement && typeof sentId !== "string") {
      return `${meta.label}: the placement id must be a string.`;
    }

    if (count === 0) {
      // Stale dropdown selections are already filtered out in buildPlatforms, so a placement here can
      // only come from raw Platform Parameters for a network with no selected profile — which would
      // otherwise reach createPost unvalidated, targeting a destination we aren't posting to.
      if (hasPlacement) {
        return `${meta.label}: no profile on this network is selected — add one, or remove the placement from Platform Parameters.`;
      }
      continue;
    }

    if (count > 1) {
      // Product rule: this extension sends one placement per network per post, so multiple profiles on
      // the same network are published separately rather than sharing (or guessing) a single placement.
      if (hasPlacement) {
        return `${meta.label}: one placement applies per network per post — select a single profile on this network, or publish the others separately.`;
      }
      if (requiresPlacement(net)) {
        return `${meta.label}: multiple profiles on this network need their own posts — publish them separately.`;
      }
      continue;
    }

    // Exactly one profile of this network is selected. If we couldn't fetch its placements, don't
    // guess — surface the real failure, but only when a placement is actually needed (one was chosen,
    // or the network mandates one); an optional network with no selection can still publish.
    if (failedByNetwork[net] && (hasPlacement || requiresPlacement(net))) {
      return `Couldn't verify the ${meta.label} — ${failedByNetwork[net].message}`;
    }
    const validIds = validByNetwork[net] ?? new Set<string>();
    if (hasPlacement) {
      if (!validIds.has(String(sentId))) {
        return `Choose a ${meta.label} to publish.`; // stale / out-of-order / invalid raw-JSON id
      }
    } else if (requiresPlacement(net)) {
      return `Choose a ${meta.label} to publish.`;
    }
  }
  return null;
}
