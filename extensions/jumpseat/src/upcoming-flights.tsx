import { usePromise, withAccessToken } from "@raycast/utils";
import { useEffect } from "react";
import { fetchUpcomingFlights } from "./api";
import { FlightsList } from "./flights-list";
import { getJumpseatAccessToken, jumpseatOAuthClient } from "./oauth";

const ACTIVE_REFRESH_INTERVAL_MS = 60_000;

function UpcomingFlightsCommand() {
  const {
    data: flights = [],
    error,
    isLoading,
    revalidate,
  } = usePromise(fetchUpcomingFlights);

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
    />
  );
}

export default withAccessToken({
  authorize: getJumpseatAccessToken,
  client: jumpseatOAuthClient,
})(UpcomingFlightsCommand);
