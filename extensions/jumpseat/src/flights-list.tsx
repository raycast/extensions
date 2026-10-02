import {
  Action,
  ActionPanel,
  Color,
  environment,
  Icon,
  Image,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { trustedJumpseatAssetUrl, trustedProfilePictureUrl } from "./assets";
import {
  JumpseatApiError,
  type FriendSummary,
  type UpcomingFlight,
} from "./api";
import { getJumpseatConfiguration } from "./config";
import {
  airportLabel,
  jumpseatFlightUrl,
  valueOrFallback,
} from "./flight-presentation";
import {
  aircraftName,
  airportCode,
  displayFlightNumber,
  effectiveArrival,
  effectiveDeparture,
  escapeMarkdown,
  formatCompactCountdown,
  formatCountdown,
  formatDate,
  formatEnumLabel,
  formatFlightStatus,
  formatTime,
} from "./format";
import { buildRouteMapUrl } from "./route-map";

export interface FlightListEntry extends UpcomingFlight {
  friend?: FriendSummary;
  userFlightId?: string;
}

interface FlightsListProps {
  flights: FlightListEntry[];
  error?: Error;
  isLoading: boolean;
  revalidate: () => void;
  kind: "personal" | "friends";
}

function statusColor(status: string | null): Color {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("cancel")) return Color.Red;
  if (normalized.includes("delay") || normalized.includes("late"))
    return Color.Orange;
  if (normalized.includes("time") || normalized.includes("schedule"))
    return Color.Green;
  return Color.SecondaryText;
}

function friendFirstName(friend: FriendSummary): string {
  return friend.fullName?.trim().split(/\s+/)[0] || "Friend";
}

function friendDisplayName(friend: FriendSummary): string {
  return friend.fullName?.trim() || "Friend";
}

function FlightActions({
  flight,
  revalidate,
}: {
  flight: FlightListEntry;
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Open Flight in Jumpseat"
        icon={Icon.Globe}
        onAction={() => open(jumpseatFlightUrl(flight))}
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

function FlightDetail({
  flight,
  showBookingDetails,
}: {
  flight: FlightListEntry;
  showBookingDetails: boolean;
}) {
  const departure = effectiveDeparture(flight);
  const arrival = effectiveArrival(flight);
  const departureCode = airportCode(flight.departureAirport);
  const arrivalCode = airportCode(flight.arrivalAirport);
  const status = formatFlightStatus(flight.flight);
  const airlineLogoUrl = trustedJumpseatAssetUrl(
    flight.airline.logoUrl,
    "airline-logo",
  );
  const friendProfilePictureUrl = trustedProfilePictureUrl(
    flight.friend?.profilePictureUrl,
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
          {flight.friend ? (
            <List.Item.Detail.Metadata.Label
              title="Friend"
              text={friendDisplayName(flight.friend)}
              icon={
                friendProfilePictureUrl
                  ? {
                      source: friendProfilePictureUrl,
                      fallback: Icon.Person,
                      mask: Image.Mask.Circle,
                    }
                  : Icon.Person
              }
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Flight Number"
            text={displayFlightNumber(flight)}
            icon={
              airlineLogoUrl
                ? { source: airlineLogoUrl, fallback: Icon.Airplane }
                : Icon.Airplane
            }
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

          {showBookingDetails ? (
            <>
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
            </>
          ) : null}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Aircraft" />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={aircraftName(flight)}
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

export function FlightsList({
  flights,
  error,
  isLoading,
  revalidate,
  kind,
}: FlightsListProps) {
  const isFriends = kind === "friends";
  const navigationTitle = isFriends
    ? "Friends' Upcoming Flights"
    : "Upcoming Flights";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle}
      searchBarPlaceholder={
        isFriends
          ? "Search friends, flights, airports, or aircraft"
          : "Search flights, airports, or aircraft"
      }
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
          icon={isFriends ? Icon.TwoPeople : Icon.Airplane}
          title={
            isFriends ? "No Friends' Upcoming Flights" : "No Upcoming Flights"
          }
          description={
            isFriends
              ? "Upcoming flights shared by your Jumpseat friends will appear here."
              : "Your next adventure will appear here once it is added to Jumpseat."
          }
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
          const friend = flight.friend;
          const subtitle = friend
            ? friendFirstName(friend)
            : displayFlightNumber(flight);

          return (
            <List.Item
              key={
                friend
                  ? `${friend.id}:${flight.userFlightId ?? flight.flight.id}`
                  : flight.flight.id
              }
              id={
                friend
                  ? `${friend.id}:${flight.userFlightId ?? flight.flight.id}`
                  : flight.flight.id
              }
              icon={
                airlineLogoUrl
                  ? { source: airlineLogoUrl, fallback: Icon.Airplane }
                  : Icon.Airplane
              }
              title={`${departureCode} → ${arrivalCode}`}
              subtitle={subtitle}
              keywords={[
                departureCode,
                arrivalCode,
                flight.departureAirport.name,
                flight.arrivalAirport?.name ?? "",
                flight.airline.name,
                aircraft,
                flight.flight.aircraftRegistration ?? "",
                friend?.fullName ?? "",
                friend?.handle ?? "",
              ]}
              detail={
                <FlightDetail flight={flight} showBookingDetails={!isFriends} />
              }
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
