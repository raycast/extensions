import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AirlineMeta } from "soaring-symbols";
import { getFlagEmoji } from "./utils";
import { fetchAirlines } from "./utils/fetch";
import SearchBar from "./components/searchbar";

export default function ViewAirlineInfo() {
  const { isLoading, data = [] } = usePromise(fetchAirlines);
  const [alliance, setAlliance] = useState("All");

  const filteredAirlines = useMemo(() => {
    if (alliance === "All") return data;
    return data.filter((a) => a.alliance === alliance);
  }, [data, alliance]);

  return (
    <List
      isLoading={isLoading}
      throttle
      isShowingDetail
      searchBarPlaceholder="Search airlines by name, IATA, or ICAO..."
      searchBarAccessory={<SearchBar type="list" selected={alliance} onSelect={setAlliance} />}
    >
      {filteredAirlines.map((airline: AirlineMeta) => {
        const flags = airline.country
          ?.split(",")
          .map((c) => getFlagEmoji(c))
          .join(" ");

        const markdown = `
<img src="https://raw.githubusercontent.com/anhthang/soaring-symbols/refs/heads/main/assets/${airline.slug}/logo.svg" alt="${airline.name}" width="200" height="200" />
`;

        return (
          <List.Item
            key={airline.iata || airline.slug}
            title={airline.name}
            icon={{
              source: `https://raw.githubusercontent.com/anhthang/soaring-symbols/refs/heads/main/assets/${airline.slug}/icon.svg`,
              fallback: Icon.CircleProgress,
            }}
            keywords={[airline.name, airline.icao, airline.iata, airline.slug].filter(Boolean)}
            accessories={airline.flag_carrier ? [{ text: flags, tooltip: "Flag Carrier" }] : undefined}
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="IATA" text={airline.iata} />
                    <List.Item.Detail.Metadata.Label title="ICAO" text={airline.icao} />
                    <List.Item.Detail.Metadata.Label title="Country" text={airline.country} />
                    {airline.branding?.tagline && (
                      <List.Item.Detail.Metadata.Label title="Tagline" text={airline.branding.tagline} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Alliance" text={airline.alliance} />
                    {airline.website && (
                      <List.Item.Detail.Metadata.Link
                        title="Website"
                        text={airline.website.replace(/^https?:\/\//, "")}
                        target={airline.website}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {airline.website && <Action.OpenInBrowser title="Open Website" url={airline.website} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
