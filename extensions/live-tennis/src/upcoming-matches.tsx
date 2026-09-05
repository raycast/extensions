import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, Fixture, ListResponse, Tour, getAuthHeaders, parseListResponse } from "./api";
import { TOUR_TITLES, capitalize, fixtureTitle, formatStartTime } from "./format";

const TOURS = Object.keys(TOUR_TITLES) as Tour[];
const PAGE_SIZE = 50;

export default function UpcomingMatches() {
  const [tour, setTour] = useState<string>("all");

  // Fixture.tour is documented as an opaque granular value (e.g. "challenger_men"),
  // so tour filtering must go through the server's ?tour= parameter. Pages are
  // fetched lazily (offset pagination) so a long schedule never truncates at
  // one page, and quota is only spent when the user actually scrolls.
  const { isLoading, data, error, revalidate, pagination } = useFetch(
    (options) => {
      const url = new URL(`${BASE_URL}/fixtures`);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(options.page * PAGE_SIZE));
      if (tour !== "all") {
        url.searchParams.set("tour", tour);
      }
      return url.toString();
    },
    {
      headers: getAuthHeaders(),
      parseResponse: (response) => parseListResponse<Fixture>(response),
      mapResult: (result: ListResponse<Fixture>) => ({ data: result.data, hasMore: result.meta.has_more }),
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load fixtures" },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
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
          {(data ?? []).map((fixture) => (
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
