import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, Fixture, Tour, getAuthHeaders, parseListResponse } from "./api";
import { TOUR_TITLES, capitalize, fixtureTitle, formatStartTime } from "./format";

const TOURS = Object.keys(TOUR_TITLES) as Tour[];

export default function UpcomingMatches() {
  const [tour, setTour] = useState<string>("all");

  // Fixture.tour is documented as an opaque granular value (e.g. "challenger_men"),
  // so tour filtering must go through the server's ?tour= parameter.
  const url = new URL(`${BASE_URL}/fixtures`);
  url.searchParams.set("limit", "200");
  if (tour !== "all") {
    url.searchParams.set("tour", tour);
  }

  const { isLoading, data, error, revalidate } = useFetch(url.toString(), {
    headers: getAuthHeaders(),
    parseResponse: (response) => parseListResponse<Fixture>(response),
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load fixtures" },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by player or tournament"
      searchBarAccessory={
        <List.Dropdown tooltip="Tour" storeValue onChange={setTour}>
          <List.Dropdown.Item title="All Tours" value="all" />
          {TOURS.map((value) => (
            <List.Dropdown.Item key={value} title={TOUR_TITLES[value]} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Fixtures"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Calendar}
            title="No Upcoming Fixtures"
            description="Nothing scheduled right now."
          />
          {(data?.data ?? []).map((fixture) => (
            <FixtureItem key={fixture.id} fixture={fixture} onRefresh={revalidate} />
          ))}
        </>
      )}
    </List>
  );
}

function FixtureItem(props: { fixture: Fixture; onRefresh: () => void }) {
  const { fixture, onRefresh } = props;

  const accessories: List.Item.Accessory[] = [];
  if (fixture.surface) {
    accessories.push({ tag: capitalize(fixture.surface) });
  }
  accessories.push({ text: formatStartTime(fixture), icon: Icon.Clock, tooltip: "Scheduled start" });

  return (
    <List.Item
      title={fixtureTitle(fixture)}
      subtitle={[fixture.tournament, fixture.round].filter(Boolean).join(" · ")}
      icon={Icon.Calendar}
      keywords={[fixture.tournament, fixture.player1_name, fixture.player2_name].filter((keyword): keyword is string =>
        Boolean(keyword),
      )}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action.CopyToClipboard
            title="Copy Fixture"
            content={`${fixtureTitle(fixture)} — ${fixture.tournament ?? ""} (${formatStartTime(fixture)})`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
