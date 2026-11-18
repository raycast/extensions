import { usePromise, withAccessToken } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { retainAirlineBrands } from "./airline-brand";
import { fetchFriendUpcomingFlights } from "./api";
import { type FlightListEntry, FlightsList } from "./flights-list";
import { getJumpseatAccessToken, jumpseatOAuthClient } from "./oauth";

const ACTIVE_REFRESH_INTERVAL_MS = 60_000;

function FriendsUpcomingFlightsCommand() {
  const previousFlights = useRef<FlightListEntry[] | undefined>(undefined);
  const {
    data: flights = [],
    error,
    isLoading,
    revalidate,
  } = usePromise(async () =>
    retainAirlineBrands(
      previousFlights.current,
      await fetchFriendUpcomingFlights(),
    ),
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
      kind="friends"
    />
  );
}

export default withAccessToken({
  authorize: getJumpseatAccessToken,
  client: jumpseatOAuthClient,
})(FriendsUpcomingFlightsCommand);
