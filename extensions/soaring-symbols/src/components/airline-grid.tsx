import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { ceasedLabel, getFlagEmoji } from "../utils";
import { previewSource, searchKeywords } from "../utils/airlines";
import AirlineAssets from "./assets";
import type { Airline, Alliance } from "soaring-symbols";
import { useAllianceFilter } from "./alliances";
import SearchBar from "./searchbar";

// The airline grid of Browse Airlines, also opened from Browse Alliances on
// one alliance's members (`alliance`, without remembering that filter, and
// the `lists` it already loaded)
export default function AirlineGrid({
  alliance: initial = "All",
  lists,
}: {
  alliance?: string;
  lists?: { airlines: Airline[]; alliances: Alliance[] };
}) {
  const { isLoading, alliances, byName, alliance, setAlliance, filtered } = useAllianceFilter(initial, lists);

  // With an active alliance picked, the airlines that ceased while in it
  // get a section of their own below those still flying in it, as on the
  // website's alliance page; otherwise one section lists them all
  const selected = byName.get(alliance);
  const sections =
    selected && !selected.defunct
      ? [
          { title: selected.name, airlines: filtered.filter((a) => !a.defunct) },
          { title: `Ceased while in ${selected.name}`, airlines: filtered.filter((a) => a.defunct) },
        ]
      : [{ title: selected ? selected.name : "All Airlines", airlines: filtered }];

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Search airlines by name, IATA, or ICAO..."
      searchBarAccessory={
        <SearchBar
          type="grid"
          alliances={alliances}
          selected={alliance}
          onSelect={setAlliance}
          storeValue={initial === "All"}
        />
      }
    >
      {sections.map((section) => (
        <Grid.Section key={section.title} title={section.title}>
          {section.airlines.map((airline) => (
            <Grid.Item
              key={airline.slug}
              content={{
                source: previewSource(airline, "logo") ?? "",
                fallback: Icon.AirplaneFilled,
              }}
              title={airline.name}
              subtitle={[airline.iata, airline.cargo && "Cargo", ceasedLabel(airline)].filter(Boolean).join(" · ")}
              keywords={searchKeywords(airline)}
              accessory={
                airline.flag_carrier
                  ? {
                      icon: getFlagEmoji(airline.country),
                      tooltip: "Flag Carrier",
                    }
                  : undefined
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Airline Information">
                    <Action.Push
                      title="View Airline Assets"
                      icon={Icon.AppWindowGrid2x2}
                      target={<AirlineAssets {...airline} />}
                    />
                    {airline.website && <Action.OpenInBrowser title="Open Website" url={airline.website} />}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
