import { useMemo } from "react";
import { Icon, List } from "@raycast/api";
import { useSetup } from "./hooks/useSetup";
import { useStatus } from "./hooks/useStatus";
import { useFavorites, useRecents, useRegions } from "./hooks/useRegions";
import { connectToRegion, toggleVpn } from "./lib/actions";
import { AUTO_REGION_ENTRY } from "./lib/regions";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { RegionListItem } from "./components/RegionListItem";
import { SetupView } from "./components/SetupView";
import { Region } from "./types";

export default function Command() {
  const setup = useSetup();
  const cliPath = setup.stage === "ready" ? setup.cliPath : undefined;

  const { status, isLoading: statusLoading, refresh } = useStatus(cliPath);
  const { regions, byId, isLoading: regionsLoading } = useRegions();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const recents = useRecents();

  const currentRegion = byId.get(status.regionId) ?? AUTO_REGION_ENTRY;

  const favoriteRegions = useMemo(
    () => regions.filter((r) => favorites.has(r.id)),
    [regions, favorites],
  );

  // Recents are stored as snapshots; re-resolve against the live catalog so
  // port-forward/offline flags stay accurate.
  const recentRegions = useMemo(
    () =>
      recents
        .map((r) => byId.get(r.id) ?? r)
        .filter((r) => !favorites.has(r.id)),
    [recents, byId, favorites],
  );

  if (setup.stage === "checking") {
    return (
      <List isLoading searchBarPlaceholder="Loading Private Internet Access…" />
    );
  }
  if (setup.stage !== "ready") {
    return <SetupView stage={setup.stage} appPath={setup.appPath} />;
  }

  const isLoading = statusLoading || regionsLoading;

  const renderItem = (region: Region, keyPrefix: string, subtitle?: string) => (
    <RegionListItem
      key={`${keyPrefix}-${region.id}`}
      region={region}
      subtitle={subtitle}
      isCurrent={status.regionId === region.id}
      isFavorite={favorites.has(region.id)}
      onConnect={() => connectToRegion(region)}
      onToggleFavorite={() => toggleFavorite(region.id)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search regions…">
      <List.Section title="Status">
        <ConnectionStatus
          status={status}
          region={currentRegion}
          appPath={setup.appPath}
          cliPath={cliPath}
          onToggle={toggleVpn}
          onSettingChanged={() => void refresh(true)}
        />
      </List.Section>

      <List.Section title="Quick Connect">
        {renderItem(
          AUTO_REGION_ENTRY,
          "auto",
          "Let PIA pick the fastest region",
        )}
      </List.Section>

      {favoriteRegions.length > 0 && (
        <List.Section title="Favorites">
          {favoriteRegions.map((r) => renderItem(r, "fav"))}
        </List.Section>
      )}

      {recentRegions.length > 0 && (
        <List.Section title="Recently used">
          {recentRegions.map((r) => renderItem(r, "recent"))}
        </List.Section>
      )}

      <List.Section title="All regions" subtitle={`${regions.length}`}>
        {regions.map((r) => renderItem(r, "all"))}
      </List.Section>

      <List.EmptyView
        icon={Icon.Globe}
        title="No regions available"
        description="Couldn't load PIA's server list. Check your connection and try again."
      />
    </List>
  );
}
