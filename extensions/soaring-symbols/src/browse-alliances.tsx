import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import type { Alliance } from "soaring-symbols";
import { operatingYears } from "./utils";
import { allianceCount, allianceMark } from "./utils/airlines";
import { fetchAirlines, fetchAlliances } from "./utils/fetch";
import AirlineGrid from "./components/airline-grid";
import { AllianceAssets } from "./components/assets";
import { allianceIcon } from "./components/alliances";

export default function BrowseAlliances() {
  const { isLoading, data: alliances = [] } = useCachedPromise(fetchAlliances);
  const { data: airlines = [] } = useCachedPromise(fetchAirlines);

  // How many of each one's airlines the collection has, as on the website
  const counts = useMemo(
    () => new Map(alliances.map((alliance) => [alliance.slug, allianceCount(alliance, airlines)])),
    [alliances, airlines],
  );

  const renderItem = (alliance: Alliance) => {
    return (
      <Grid.Item
        key={alliance.slug}
        content={allianceIcon(alliance)}
        title={alliance.name}
        subtitle={[operatingYears(alliance), counts.get(alliance.slug)].filter(Boolean).join(" · ")}
        keywords={[alliance.slug, alliance.branding?.tagline].filter((k): k is string => Boolean(k))}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Alliance">
              <Action.Push
                title="Show Member Airlines"
                icon={Icon.AirplaneFilled}
                target={<AirlineGrid alliance={alliance.name} lists={{ airlines, alliances }} />}
              />
              {allianceMark(alliance) && (
                <Action.Push
                  title="View Alliance Assets"
                  icon={Icon.AppWindowGrid2x2}
                  target={<AllianceAssets {...alliance} />}
                />
              )}
              {alliance.website && <Action.OpenInBrowser title="Open Website" url={alliance.website} />}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <Grid isLoading={isLoading} columns={4} inset={Grid.Inset.Large} searchBarPlaceholder="Search alliances...">
      <Grid.Section title="Alliances">{alliances.filter((a) => !a.defunct).map(renderItem)}</Grid.Section>
      <Grid.Section title="Disbanded">{alliances.filter((a) => a.defunct).map(renderItem)}</Grid.Section>
    </Grid>
  );
}
