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
import { showFailureToast } from "@raycast/utils";
import {
  flightAirline,
  flightAirlineKeywords,
  flightAirlineName,
} from "./airline-brand";
import { trustedAirlineLogoSource, trustedProfilePictureUrl } from "./assets";
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
  flightNumberKeywords,
  formatCompactCountdown,
  formatCountdown,
  formatDate,
  formatEnumLabel,
  formatFlightStatus,
  formatListDate,
  formatTime,
} from "./format";
import { reconnectJumpseat } from "./oauth";
import { buildRouteMapUrl } from "./route-map";

export interface FlightListEntry extends UpcomingFlight {
  friend?: FriendSummary;
  userFlightId?: string;
}

export type FlightsListKind = "personal" | "past" | "friends";

interface FlightsListProps {
  flights: FlightListEntry[];
  error?: Error;
  isLoading: boolean;
  revalidate: () => void;
  kind: FlightsListKind;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  pagination?: List.Props["pagination"];
}

const NAVIGATION_TITLES: Record<FlightsListKind, string> = {
  personal: "Upcoming Flights",
  past: "Past Flights",
  friends: "Friends' Upcoming Flights",
};

async function reconnect(revalidate: () => void) {
  try {
    await reconnectJumpseat();
    revalidate();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Reconnect Jumpseat" });
  }
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
  showCountdown,
}: {
  flight: FlightListEntry;
  showBookingDetails: boolean;
  showCountdown: boolean;
}) {
  const departure = effectiveDeparture(flight);
  const arrival = effectiveArrival(flight);
  const departureCode = airportCode(flight.departureAirport);
  const arrivalCode = airportCode(flight.arrivalAirport);
  const status = formatFlightStatus(flight.flight);
  const airlineLogo = trustedAirlineLogoSource(flightAirline(flight));
  const airlineName = flightAirlineName(flight);
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
              airlineLogo
                ? { source: airlineLogo, fallback: Icon.Airplane }
                : Icon.Airplane
            }
          />
          {airlineName ? (
            <List.Item.Detail.Metadata.Label
              title="Airline"
              text={airlineName}
            />
          ) : null}
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
          {showCountdown ? (
            <List.Item.Detail.Metadata.Label
              title="Countdown"
              text={formatCountdown(departure)}
            />
          ) : null}
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
  searchBarAccessory,
  pagination,
}: FlightsListProps) {
  const isFriends = kind === "friends";
  const isPast = kind === "past";
  // A grant from before past flights existed is refused, not expired.
  const needsPastFlightsAccess =
    isPast && error instanceof JumpseatApiError && error.status === 403;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={NAVIGATION_TITLES[kind]}
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      searchBarPlaceholder={
        isFriends
          ? "Search friends, flights, airports, or aircraft"
          : "Search flights, airports, or aircraft"
      }
    >
      {needsPastFlightsAccess ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Reconnect to See Past Flights"
          description="Your Jumpseat connection predates past flights. Reconnect once to allow Raycast to show them."
          actions={
            <ActionPanel>
              <Action
                title="Reconnect Jumpseat"
                icon={Icon.Link}
                onAction={() => reconnect(revalidate)}
              />
            </ActionPanel>
          }
        />
      ) : error ? (
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
            isFriends
              ? "No Friends' Upcoming Flights"
              : isPast
                ? "No Past Flights"
                : "No Upcoming Flights"
          }
          description={
            isFriends
              ? "Upcoming flights shared by your Jumpseat friends will appear here."
              : isPast
                ? "Flights you have taken will appear here."
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
          const airlineLogo = trustedAirlineLogoSource(flightAirline(flight));
          const airlineName = flightAirlineName(flight);
          const icon: Image.ImageLike = airlineLogo
            ? { source: airlineLogo, fallback: Icon.Airplane }
            : Icon.Airplane;
          const friend = flight.friend;
          // The detail pane hides accessories, so a past flight's date goes in
          // the subtitle where it stays visible.
          const subtitle = friend
            ? friendFirstName(friend)
            : isPast
              ? `${displayFlightNumber(flight)} · ${formatListDate(
                  departure,
                  flight.departureAirport.timeZoneRegionName,
                )}`
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
              icon={airlineName ? { value: icon, tooltip: airlineName } : icon}
              title={`${departureCode} → ${arrivalCode}`}
              subtitle={subtitle}
              keywords={[
                ...flightNumberKeywords(flight),
                departureCode,
                arrivalCode,
                flight.departureAirport.name,
                flight.arrivalAirport?.name ?? "",
                ...flightAirlineKeywords(flight),
                aircraft,
                flight.flight.aircraftRegistration ?? "",
                friend?.fullName ?? "",
                friend?.handle ?? "",
              ]}
              detail={
                <FlightDetail
                  flight={flight}
                  showBookingDetails={!isFriends}
                  showCountdown={!isPast}
                />
              }
              accessories={
                isPast
                  ? undefined
                  : [
                      {
                        tag: {
                          color: statusColor(formatFlightStatus(flight.flight)),
                          value: formatCompactCountdown(departure),
                        },
                        tooltip: formatCountdown(departure),
                      },
                    ]
              }
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
