import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  // open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useRef } from "react";
import {
  fetchUpcomingFlights,
  JumpseatApiError,
  type UpcomingFlight,
} from "./api";
import { trustedJumpseatAssetUrl } from "./assets";
import {
  flightSummary,
  // jumpseatFlightUrl,
  valueOrFallback,
} from "./flight-presentation";
import {
  aircraftName,
  airportCode,
  displayFlightNumber,
  effectiveArrival,
  effectiveDeparture,
  formatFlightStatus,
  formatTime,
} from "./format";
import {
  isArrivedFlight,
  menuBarTitle,
  operationalMenuBarStatus,
  resolveMenuBarLoadState,
  selectMenuBarFlight,
} from "./menu-bar-flight";
import { getJumpseatAccessToken, jumpseatOAuthClient } from "./oauth";

function route(flight: UpcomingFlight): string {
  return `${airportCode(flight.departureAirport)} → ${airportCode(flight.arrivalAirport)}`;
}

function joinedDetails(
  values: Array<string | null | undefined>,
  fallback = "Not available",
): string {
  const present = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return present.length > 0 ? present.join(" · ") : fallback;
}

function FlightDetails({ flight }: { flight: UpcomingFlight }) {
  const departure = effectiveDeparture(flight);
  const arrival = effectiveArrival(flight);
  const status =
    operationalMenuBarStatus(flight) ?? formatFlightStatus(flight.flight);
  const logo = trustedJumpseatAssetUrl(flight.airline.logoUrl, "airline-logo");

  return (
    <>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={logo ? { source: logo } : Icon.Airplane}
          title={`${displayFlightNumber(flight)} · ${route(flight)}`}
        />
        <MenuBarExtra.Item title="Status" subtitle={status} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Departure">
        <MenuBarExtra.Item
          title="Time"
          subtitle={formatTime(
            departure,
            flight.departureAirport.timeZoneRegionName,
          )}
        />
        <MenuBarExtra.Item
          title="Terminal · Gate"
          subtitle={joinedDetails([
            flight.flight.departureTerminal
              ? `Terminal ${flight.flight.departureTerminal}`
              : "Terminal TBD",
            flight.flight.departureGate
              ? `Gate ${flight.flight.departureGate}`
              : "Gate TBD",
          ])}
        />
        <MenuBarExtra.Item
          title="Check-in Desk"
          subtitle={valueOrFallback(flight.flight.checkIn, "TBD")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Arrival">
        <MenuBarExtra.Item
          title="Time"
          subtitle={formatTime(
            arrival,
            flight.arrivalAirport?.timeZoneRegionName ?? null,
          )}
        />
        <MenuBarExtra.Item
          title="Terminal · Gate"
          subtitle={joinedDetails([
            flight.flight.arrivalTerminal
              ? `Terminal ${flight.flight.arrivalTerminal}`
              : "Terminal TBD",
            flight.flight.arrivalGate
              ? `Gate ${flight.flight.arrivalGate}`
              : "Gate TBD",
          ])}
        />
        <MenuBarExtra.Item
          title="Baggage Belt"
          subtitle={valueOrFallback(flight.flight.belt, "TBD")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Flight">
        <MenuBarExtra.Item
          title="Seat"
          subtitle={valueOrFallback(flight.seatNumber, "Not added")}
        />
        <MenuBarExtra.Item title="Aircraft" subtitle={aircraftName(flight)} />
      </MenuBarExtra.Section>
    </>
  );
}

function OtherFlights({
  flights,
  selected,
}: {
  flights: UpcomingFlight[];
  selected: UpcomingFlight | null;
}) {
  const remaining = flights.filter(
    (flight) => flight.flight.id !== selected?.flight.id,
  );
  const recentlyArrived = remaining
    .filter(isArrivedFlight)
    .sort(
      (left, right) =>
        (effectiveArrival(right)?.getTime() ?? 0) -
        (effectiveArrival(left)?.getTime() ?? 0),
    )
    .slice(0, 1);
  const otherUpcoming = remaining
    .filter((flight) => !isArrivedFlight(flight))
    .sort(
      (left, right) =>
        effectiveDeparture(left).getTime() -
        effectiveDeparture(right).getTime(),
    )
    .slice(0, 3);
  const visible = [...recentlyArrived, ...otherUpcoming];
  if (visible.length === 0) return null;

  return (
    <MenuBarExtra.Section title="Other Flights">
      {visible.map((flight) => {
        const logo = trustedJumpseatAssetUrl(
          flight.airline.logoUrl,
          "airline-logo",
        );
        return (
          <MenuBarExtra.Item
            key={flight.flight.id}
            icon={logo ? { source: logo } : Icon.Airplane}
            title={`${displayFlightNumber(flight)} · ${route(flight)}`}
            subtitle={
              isArrivedFlight(flight)
                ? "Recently Arrived"
                : formatTime(
                    effectiveDeparture(flight),
                    flight.departureAirport.timeZoneRegionName,
                  )
            }
            // onAction={() => open(jumpseatFlightUrl(flight))}
          />
        );
      })}
    </MenuBarExtra.Section>
  );
}

function MenuActions({
  flight,
  refresh,
}: {
  flight: UpcomingFlight | null;
  refresh: () => void;
}) {
  return (
    <MenuBarExtra.Section>
      {flight ? (
        <>
          {/* <MenuBarExtra.Item
            icon={Icon.Globe}
            title="Open Flight in Jumpseat"
            onAction={() => open(jumpseatFlightUrl(flight))}
          /> */}
          <MenuBarExtra.Item
            icon={Icon.Clipboard}
            title="Copy Flight Summary"
            onAction={async () => {
              await Clipboard.copy(flightSummary(flight));
              await showHUD("Copied flight summary");
            }}
          />
        </>
      ) : null}
      <MenuBarExtra.Item
        icon={Icon.List}
        title="Open Upcoming Flights"
        onAction={() =>
          launchCommand({
            name: "upcoming-flights",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <MenuBarExtra.Item
        icon={Icon.ArrowClockwise}
        title="Refresh"
        onAction={refresh}
      />
      <MenuBarExtra.Item
        icon={Icon.Gear}
        title="Open Extension Preferences"
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra.Section>
  );
}

function NextFlightInMenuBarCommand() {
  const { data, error, isLoading, revalidate } =
    useCachedPromise(fetchUpcomingFlights);
  const lastSuccessfulFlights = useRef<UpcomingFlight[] | undefined>(undefined);
  if (!error && data) lastSuccessfulFlights.current = data;

  const load = resolveMenuBarLoadState({
    latestFlights: data,
    lastSuccessfulFlights:
      error instanceof JumpseatApiError && error.status === 401
        ? undefined
        : lastSuccessfulFlights.current,
    error,
  });
  const now = new Date();
  const selected = selectMenuBarFlight(load.flights, now);

  if (!selected) {
    return isLoading ? (
      <MenuBarExtra isLoading tooltip="Next Jumpseat flight" />
    ) : null;
  }

  const selectedAirlineLogo = trustedJumpseatAssetUrl(
    selected.airline.logoUrl,
    "airline-logo",
  );

  return (
    <MenuBarExtra
      icon={{
        source: selectedAirlineLogo ?? "unknown-airline.svg",
        fallback: "unknown-airline.svg",
      }}
      isLoading={isLoading}
      title={menuBarTitle(selected, now)}
      tooltip="Next Jumpseat flight"
    >
      <FlightDetails flight={selected} />
      <OtherFlights flights={load.flights} selected={selected} />
      {load.state === "stale-error" ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Warning}
            title="Could Not Refresh Flights"
            subtitle={error?.message}
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuActions flight={selected} refresh={revalidate} />
    </MenuBarExtra>
  );
}

export default withAccessToken({
  authorize: getJumpseatAccessToken,
  client: jumpseatOAuthClient,
})(NextFlightInMenuBarCommand);
