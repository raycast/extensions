import { List } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { retainAirlineBrands } from "./airline-brand";
import {
  fetchPastFlightsPage,
  fetchUpcomingFlights,
  type OwnFlightsCursor,
} from "./api";
import { type FlightListEntry, FlightsList } from "./flights-list";
import { getJumpseatAccessToken, jumpseatOAuthClient } from "./oauth";

const ACTIVE_REFRESH_INTERVAL_MS = 60_000;

type FlightsView = "upcoming" | "past";

function FlightsViewDropdown({
  value,
  onChange,
}: {
  value: FlightsView;
  onChange: (value: FlightsView) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Show Flights"
      value={value}
      onChange={(next) => onChange(next === "past" ? "past" : "upcoming")}
    >
      <List.Dropdown.Item title="Upcoming" value="upcoming" />
      <List.Dropdown.Item title="Past" value="past" />
    </List.Dropdown>
  );
}

function UpcomingFlights({
  dropdown,
}: {
  dropdown: List.Props["searchBarAccessory"];
}) {
  const previousFlights = useRef<FlightListEntry[] | undefined>(undefined);
  const {
    data: flights = [],
    error,
    isLoading,
    revalidate,
  } = usePromise(async () =>
    retainAirlineBrands(previousFlights.current, await fetchUpcomingFlights()),
  );
  if (!error && flights.length > 0) previousFlights.current = flights;

  useEffect(() => {
    const interval = setInterval(() => {
      void revalidate();
    }, ACTIVE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [revalidate]);

  return (
    <FlightsList
      flights={flights}
      error={error}
      isLoading={isLoading}
      revalidate={revalidate}
      kind="personal"
      searchBarAccessory={dropdown}
    />
  );
}

function PastFlights({
  dropdown,
}: {
  dropdown: List.Props["searchBarAccessory"];
}) {
  // Past flights are settled, so they load page by page and never auto-refresh.
  const {
    data: flights = [],
    error,
    isLoading,
    revalidate,
    pagination,
  } = usePromise(
    () =>
      async ({ cursor }: { cursor?: OwnFlightsCursor | null }) => {
        const page = await fetchPastFlightsPage(cursor ?? null);
        return {
          data: page.flights,
          hasMore: page.hasMore,
          cursor: page.nextCursor,
        };
      },
    [],
  );

  return (
    <FlightsList
      flights={flights}
      error={error}
      isLoading={isLoading}
      revalidate={revalidate}
      kind="past"
      searchBarAccessory={dropdown}
      pagination={pagination}
    />
  );
}

function UpcomingFlightsCommand() {
  const [view, setView] = useState<FlightsView>("upcoming");
  const dropdown = <FlightsViewDropdown value={view} onChange={setView} />;

  return view === "past" ? (
    <PastFlights dropdown={dropdown} />
  ) : (
    <UpcomingFlights dropdown={dropdown} />
  );
}

export default withAccessToken({
  authorize: getJumpseatAccessToken,
  client: jumpseatOAuthClient,
})(UpcomingFlightsCommand);
