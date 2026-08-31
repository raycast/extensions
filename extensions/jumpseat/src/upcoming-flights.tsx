import {
  Action,
  ActionPanel,
  Color,
  environment,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useEffect } from "react";
import { trustedJumpseatAssetUrl } from "./assets";
import {
  fetchUpcomingFlights,
  JumpseatApiError,
  type UpcomingFlight,
} from "./api";
import { getJumpseatAccessToken, jumpseatOAuthClient } from "./oauth";
import { getJumpseatConfiguration } from "./config";
import { buildRouteMapUrl } from "./route-map";
import {
  aircraftName,
  airportCode,
  displayFlightNumber,
  effectiveArrival,
  effectiveDeparture,
  escapeMarkdown,
  formatEnumLabel,
  formatFlightStatus,
  formatCompactCountdown,
  formatCountdown,
  formatDate,
  formatTime,
} from "./format";
import {
  airportLabel,
  flightSummary,
  // jumpseatFlightUrl,
  valueOrFallback,
} from "./flight-presentation";

const ACTIVE_REFRESH_INTERVAL_MS = 60_000;

function statusColor(status: string | null): Color {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("cancel")) return Color.Red;
  if (normalized.includes("delay") || normalized.includes("late"))
    return Color.Orange;
  if (normalized.includes("time") || normalized.includes("schedule"))
    return Color.Green;
  return Color.SecondaryText;
}

function aircraftDetails(flight: UpcomingFlight): string {
  return aircraftName(flight);
}

function FlightActions({
  flight,
  revalidate,
}: {
  flight: UpcomingFlight;
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      {/* <Action.OpenInBrowser
        title="Open Flight in Jumpseat"
        url={jumpseatFlightUrl(flight)}
      /> */}
      <Action.CopyToClipboard
        title="Copy Flight Summary"
        content={flightSummary(flight)}
      />
      <Action
        title="Refresh Flights"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

function FlightDetail({ flight }: { flight: UpcomingFlight }) {
  const departure = effectiveDeparture(flight);
  const arrival = effectiveArrival(flight);
  const departureCode = airportCode(flight.departureAirport);
  const arrivalCode = airportCode(flight.arrivalAirport);
  const status = formatFlightStatus(flight.flight);
  const airlineLogoUrl = trustedJumpseatAssetUrl(
    flight.airline.logoUrl,
    "airline-logo",
  );
  const routeMapUrl = buildRouteMapUrl({
    apiBaseUrl: getJumpseatConfiguration().apiBaseUrl,
    departureIata: flight.departureAirport.iata,
    arrivalIata: flight.arrivalAirport?.iata,
    theme: environment.appearance,
  });
  const markdown = routeMapUrl
    ? `![${escapeMarkdown(`${departureCode} to ${arrivalCode} route map`)}](${routeMapUrl})`
    : null;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Flight Number"
            text={displayFlightNumber(flight)}
            icon={airlineLogoUrl ? { source: airlineLogoUrl } : Icon.Airplane}
          />
          <List.Item.Detail.Metadata.Label
            title="Route"
            text={`${departureCode} → ${arrivalCode}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={formatDate(
              departure,
              flight.departureAirport.timeZoneRegionName,
            )}
          />
          <List.Item.Detail.Metadata.Label
            title="Countdown"
            text={formatCountdown(departure)}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={status}
              color={statusColor(status)}
            />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Departure" />
          <List.Item.Detail.Metadata.Label
            title="Time"
            text={formatTime(
              departure,
              flight.departureAirport.timeZoneRegionName,
            )}
          />
          <List.Item.Detail.Metadata.Label
            title="Airport"
            text={airportLabel(flight.departureAirport)}
          />
          <List.Item.Detail.Metadata.Label
            title="Terminal"
            text={valueOrFallback(flight.flight.departureTerminal, "TBD")}
          />
          <List.Item.Detail.Metadata.Label
            title="Check-in Desk"
            text={valueOrFallback(flight.flight.checkIn, "TBD")}
          />
          <List.Item.Detail.Metadata.Label
            title="Boarding Gate"
            text={valueOrFallback(flight.flight.departureGate, "TBD")}
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Arrival" />
          <List.Item.Detail.Metadata.Label
            title="Time"
            text={formatTime(
              arrival,
              flight.arrivalAirport?.timeZoneRegionName ?? null,
            )}
          />
          <List.Item.Detail.Metadata.Label
            title="Airport"
            text={airportLabel(flight.arrivalAirport)}
          />
          <List.Item.Detail.Metadata.Label
            title="Terminal"
            text={valueOrFallback(flight.flight.arrivalTerminal, "TBD")}
          />
          <List.Item.Detail.Metadata.Label
            title="Gate"
            text={valueOrFallback(flight.flight.arrivalGate, "TBD")}
          />
          <List.Item.Detail.Metadata.Label
            title="Baggage Belt"
            text={valueOrFallback(flight.flight.belt, "TBD")}
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Booking" />
          <List.Item.Detail.Metadata.Label
            title="Seat"
            text={valueOrFallback(flight.seatNumber, "Not added")}
          />
          <List.Item.Detail.Metadata.Label
            title="Cabin"
            text={formatEnumLabel(flight.seatCabinClass)}
          />
          <List.Item.Detail.Metadata.Label
            title="Seat Position"
            text={formatEnumLabel(flight.seatPosition)}
          />
          <List.Item.Detail.Metadata.Label
            title="Booking Reference"
            text={valueOrFallback(flight.bookingNumber, "Not added")}
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Aircraft" />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={aircraftDetails(flight)}
          />
          <List.Item.Detail.Metadata.Label
            title="Registration"
            text={valueOrFallback(
              flight.flight.aircraftRegistration,
              "Not assigned",
            )}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

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
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Upcoming Flights"
      searchBarPlaceholder="Search flights, airports, or aircraft"
    >
      {error ? (
        <List.EmptyView
          icon={
            error instanceof JumpseatApiError && error.status === 401
              ? Icon.Lock
              : Icon.Warning
          }
          title="Could Not Load Flights"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : flights.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Airplane}
          title="No Upcoming Flights"
          description="Your next adventure will appear here once it is added to Jumpseat."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Flights"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        flights.map((flight) => {
          const departure = effectiveDeparture(flight);
          const departureCode = airportCode(flight.departureAirport);
          const arrivalCode = airportCode(flight.arrivalAirport);
          const aircraft = aircraftName(flight);
          const airlineLogoUrl = trustedJumpseatAssetUrl(
            flight.airline.logoUrl,
            "airline-logo",
          );

          return (
            <List.Item
              key={flight.flight.id}
              id={flight.flight.id}
              icon={airlineLogoUrl ? { source: airlineLogoUrl } : Icon.Airplane}
              title={`${departureCode} → ${arrivalCode}`}
              subtitle={displayFlightNumber(flight)}
              keywords={[
                departureCode,
                arrivalCode,
                flight.departureAirport.name,
                flight.arrivalAirport?.name ?? "",
                flight.airline.name,
                aircraft,
                flight.flight.aircraftRegistration ?? "",
              ]}
              detail={<FlightDetail flight={flight} />}
              accessories={[
                {
                  tag: {
                    color: statusColor(formatFlightStatus(flight.flight)),
                    value: formatCompactCountdown(departure),
                  },
                  tooltip: formatCountdown(departure),
                },
              ]}
              actions={
                <FlightActions flight={flight} revalidate={revalidate} />
              }
            />
          );
        })
      )}
    </List>
  );
}

export default withAccessToken({
  authorize: getJumpseatAccessToken,
  client: jumpseatOAuthClient,
})(UpcomingFlightsCommand);
