import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { api, authHeaders, normalizeList } from "../lib/postproxy";
import { formatDate, formatNumber, humanizeKey } from "../lib/format";
import { needsPlacement, platformLabel } from "../lib/platforms";
import type { Placement, Profile, ProfileStatsResponse } from "../lib/types";

/**
 * Lazy stats panel for the Profiles list. Only mounts for the selected item, so
 * the per-profile stats call (and placement lookup for FB/LinkedIn/Telegram) is
 * deferred until the detail panel is actually shown.
 */
export function ProfileStats({ profile, groupName }: { profile: Profile; groupName?: string }) {
  const requiresPlacement = needsPlacement(profile.platform);

  const {
    data: placements,
    isLoading: loadingPlacements,
    error: placementsError,
  } = useFetch(api(`/profiles/${profile.id}/placements`), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<Placement>(result) }),
    initialData: [] as Placement[],
    execute: requiresPlacement,
  });

  const placementId = requiresPlacement ? (placements.find((p) => p.id)?.id ?? undefined) : undefined;
  const canFetchStats = !requiresPlacement || Boolean(placementId);
  const statsUrl = api(`/profiles/${profile.id}/stats${placementId ? `?placement_id=${placementId}` : ""}`);

  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
  } = useFetch<ProfileStatsResponse>(statsUrl, {
    headers: authHeaders(),
    execute: canFetchStats,
  });
  const error = placementsError ?? statsError;

  if (requiresPlacement && !placementId && !loadingPlacements) {
    return (
      <List.Item.Detail
        markdown={`### ${profile.name}\n\nNo placement (page / channel) is available for **${platformLabel(
          profile.platform,
        )}**, so stats can't be loaded. Connect one in the Postproxy dashboard.`}
      />
    );
  }

  const isLoading = loadingPlacements || (canFetchStats && loadingStats);
  const latest = stats?.data?.records?.at(-1);
  const statEntries = latest ? Object.entries(latest.stats) : [];

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Profile" text={profile.name} />
          <List.Item.Detail.Metadata.Label title="Platform" text={platformLabel(profile.platform)} />
          {groupName ? <List.Item.Detail.Metadata.Label title="Group" text={groupName} /> : null}
          <List.Item.Detail.Metadata.Label title="Posts" text={formatNumber(profile.post_count)} />
          <List.Item.Detail.Metadata.Separator />
          {statEntries.length > 0 ? (
            statEntries.map(([key, value]) => (
              <List.Item.Detail.Metadata.Label key={key} title={humanizeKey(key)} text={formatNumber(value)} />
            ))
          ) : error ? (
            <List.Item.Detail.Metadata.Label title="Stats" text={`Error: ${error.message}`} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Stats" text={isLoading ? "Loading…" : "No data yet"} />
          )}
          {latest ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Recorded" text={formatDate(latest.recorded_at)} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
