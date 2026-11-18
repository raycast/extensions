import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ceasedLabel, getFlagEmoji, operatingYears } from "./utils";
import type { Airline } from "soaring-symbols";
import {
  allianceMark,
  countryName,
  flagCarrierCountries,
  formerNames,
  groupAirlines,
  previewUrl,
  searchKeywords,
} from "./utils/airlines";
import { allianceIcon, useAllianceFilter } from "./components/alliances";
import SearchBar from "./components/searchbar";

export default function ViewAirlineInfo() {
  const {
    isLoading,
    airlines: data,
    alliances,
    byName,
    alliance,
    setAlliance,
    filtered: filteredAirlines,
  } = useAllianceFilter();
  const [searchText, setSearchText] = useState("");

  // Parents and subsidiaries come from the whole list, whatever the filter
  const groups = useMemo(() => groupAirlines(data), [data]);

  // Jump to a related airline: search for it with the alliance filter cleared
  const showAirline = (name: string) => {
    setAlliance("All");
    setSearchText(name);
  };

  return (
    <List
      isLoading={isLoading}
      throttle
      isShowingDetail
      filtering
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search airlines by name, IATA, or ICAO..."
      searchBarAccessory={<SearchBar type="list" alliances={alliances} selected={alliance} onSelect={setAlliance} />}
    >
      {filteredAirlines.map((airline: Airline) => {
        const flags = flagCarrierCountries(airline)
          .map((c) => getFlagEmoji(c))
          .join(" ");

        const logo = previewUrl(airline, "logo");
        const ceased = ceasedLabel(airline);
        const years = operatingYears(airline);
        const parent = groups.parents.get(airline.slug);
        const owned = groups.subsidiaries.get(airline.slug) ?? [];
        // Subsidiaries that no longer fly under it (Jetstar Pacific under
        // Jetstar) get a row of their own
        const successor = airline.successor ? groups.bySlug.get(airline.successor) : undefined;
        const predecessors = (airline.predecessors ?? []).flatMap((slug) => groups.bySlug.get(slug) ?? []);
        // Links to other airlines, one row per relation it has
        const relatedRows = [
          { title: "Part of", airlines: parent ? [parent] : [] },
          { title: "Subsidiaries", airlines: owned.filter((sub) => !sub.defunct) },
          { title: "Former Subsidiaries", airlines: owned.filter((sub) => sub.defunct) },
          { title: "Succeeded By", airlines: successor ? [successor] : [] },
          { title: "Preceded By", airlines: predecessors },
        ].filter((row) => row.airlines.length > 0);

        const former = formerNames(airline);
        // The alliance's mark beside its name, once the collection has one
        const memberOf = airline.alliance ? byName.get(airline.alliance) : undefined;

        const markdown = logo ? `<img src="${logo}" alt="${airline.name}" width="200" height="200" />` : "";

        return (
          <List.Item
            key={airline.slug}
            title={airline.name}
            icon={{
              source: previewUrl(airline, "icon") ?? "",
              fallback: Icon.CircleProgress,
            }}
            keywords={searchKeywords(airline)}
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    {airline.branding?.tagline && (
                      <List.Item.Detail.Metadata.Label title="Tagline" text={airline.branding.tagline} />
                    )}
                    {/* Status lives here: the detail pane hides List.Item accessories */}
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={ceased ?? "Operating"}
                        color={ceased ? Color.SecondaryText : Color.Green}
                      />
                      {airline.flag_carrier && (
                        <List.Item.Detail.Metadata.TagList.Item text={`${flags} Flag Carrier`} color={Color.Blue} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="IATA" text={airline.iata} />
                    <List.Item.Detail.Metadata.Label title="ICAO" text={airline.icao} />
                    {airline.callsign && <List.Item.Detail.Metadata.Label title="Callsign" text={airline.callsign} />}
                    {years && (
                      <List.Item.Detail.Metadata.Label title={airline.ceased ? "Operated" : "Founded"} text={years} />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Country"
                      text={`${getFlagEmoji(airline.country)} ${countryName(airline.country)}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Alliance"
                      text={airline.alliance}
                      icon={allianceMark(memberOf) ? allianceIcon(memberOf) : undefined}
                    />
                    {airline.alliance_history?.length ? (
                      <List.Item.Detail.Metadata.Label
                        title="Former Alliances"
                        text={airline.alliance_history
                          .map((m) => `${m.alliance} (${m.since ? `${m.since}–` : "until "}${m.until})`)
                          .join(", ")}
                      />
                    ) : null}
                    {airline.hubs?.length ? (
                      <List.Item.Detail.Metadata.TagList title={airline.hubs.length > 1 ? "Hubs" : "Hub"}>
                        {airline.hubs.map((hub) => (
                          <List.Item.Detail.Metadata.TagList.Item key={hub} text={hub} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : null}
                    {former.length ? (
                      <List.Item.Detail.Metadata.Label title="Formerly" text={former.join(", ")} />
                    ) : null}
                    {relatedRows.map((row) => (
                      <List.Item.Detail.Metadata.TagList key={row.title} title={row.title}>
                        {row.airlines.map((other) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={other.slug}
                            text={other.name}
                            onAction={() => showAirline(other.name)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ))}
                    {airline.website && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Website"
                          text={airline.website.replace(/^https?:\/\//, "")}
                          target={airline.website}
                        />
                      </>
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
