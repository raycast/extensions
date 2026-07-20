import { Fragment, useCallback, useEffect, useState, useRef } from "react";
import { Feature } from "../types";
import { ActionPanel, Action, Color, List, Icon, useNavigation } from "@raycast/api";
import { fetchTrip } from "../api";
import {
  getTransportIcon,
  formatAsClock,
  formatTimeDifferenceAsClock,
  formatMetersToHuman,
  formatDestinationDisplay,
  formatAsDate,
} from "../utils";
import { Leg, TripPattern } from "../api/tripsQuery";
import TripDetailsPage from "./TripDetailsPage";

type Props = {
  origin: Feature;
  destination: Feature;
};
export default function TripsPage({ origin, destination }: Props) {
  const tripPatterns = useRef<TripPattern[]>([]);
  const [groupedTrips, setGroupedTrips] = useState<GroupedTrips>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pageCursor, setPageCursor] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    loadMore("", []);
  }, []);

  const loadMore = useCallback(
    async (cursor: string, prevState: TripPattern[]) => {
      setIsLoading(true);
      const tripQuery = await fetchTrip(origin.properties.id, destination.properties.id, cursor);
      if (tripQuery) {
        tripPatterns.current = prevState.concat(tripQuery.trip.tripPatterns);
        setGroupedTrips(groupTripsByDate(tripPatterns.current));
        setPageCursor(tripQuery.trip.nextPageCursor);
      }
      setIsLoading(false);
    },
    [origin, destination],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder={`From ${origin.properties.name} to ${destination.properties.name}...`}
    >
      {Object.entries(groupedTrips).length === 0 && (
        <List.EmptyView
          description="No trip results. You could try loading more to extend the search window."
          actions={
            <ActionPanel>
              <Action
                title="Load More"
                onAction={() => loadMore(pageCursor, tripPatterns.current)}
              />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(groupedTrips).map(([date, trips]) => (
        <List.Section title={date === new Date().toDateString() ? "Today" : date} key={date}>
          {trips.map((trip, idx) => (
            <List.Item
              detail={<List.Item.Detail metadata={<TripDetails trip={trip} />} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Trip"
                    onAction={() => push(<TripDetailsPage trip={trip} />)}
                  />
                  <Action
                    title="Load More"
                    onAction={() => loadMore(pageCursor, tripPatterns.current)}
                  />
                </ActionPanel>
              }
              title={`${formatAsClock(trip.expectedStartTime)} - ${formatAsClock(trip.expectedEndTime)}`}
              accessories={getTripAccessories(trip)}
              key={idx}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const TripDetails = ({ trip }: { trip: TripPattern }) => {
  const getDestinationTitle = (leg: Leg) =>
    `${formatAsClock(leg.expectedEndTime)} ${leg.toPlace.quay.name} ${leg.toPlace.quay.publicCode || ""}`;

  return (
    <List.Item.Detail.Metadata>
      {trip.legs.map((leg, idx) => (
        <Fragment key={idx}>
          <List.Item.Detail.Metadata.Label
            title={getTitleText(leg)}
            icon={getTransportIcon(leg.mode, leg.transportSubmode)}
            text={getLabelText(leg)}
          />
          <List.Item.Detail.Metadata.Separator />
        </Fragment>
      ))}
      <List.Item.Detail.Metadata.Label
        title={trip.legs.length > 0 ? getDestinationTitle(trip.legs[trip.legs.length - 1]) : ""}
        text={formatTimeDifferenceAsClock(trip.expectedStartTime, trip.expectedEndTime) + " total"}
        icon={Icon.Clock}
      />
    </List.Item.Detail.Metadata>
  );
};

type GroupedTrips = Record<string, TripPattern[]>;
const groupTripsByDate = (trips: TripPattern[]) => {
  const grouped: Record<string, TripPattern[]> = {};
  trips.forEach((trip) => {
    const date = formatAsDate(trip.expectedStartTime);
    grouped[date] = [...(grouped[date] || []), trip];
  });
  return grouped;
};

// TODO: Should add a warning triangle if service disruptions are present
const getTripAccessories = (trip: TripPattern): List.Item.Accessory[] => {
  // Filter out insignificant walk distances
  const legs = trip.legs.filter(
    (leg) => leg.fromPlace.quay.stopPlace?.id !== leg.toPlace.quay.stopPlace?.id,
  );

  let accessories: List.Item.Accessory[] = legs.map((leg) => ({
    icon: getTransportIcon(leg.mode, leg.transportSubmode),
    // Show public code only if there's space for it (less than 4 legs when
    // details are open)
    text: legs.length < 4 ? leg.line?.publicCode : undefined,
    tooltip: `${getTitleText(leg)} • ${getLabelText(leg)}`,
  }));

  // Truncate and show ellipsis if details are open and there's more than 5 legs
  if (accessories.length > 5) {
    accessories = accessories.slice(0, 4);
    accessories.push({
      icon: { source: Icon.Ellipsis, tintColor: Color.SecondaryText },
      tooltip: `${legs.length - 4} more`,
    });
  }

  return accessories;
};

export const getTitleText = (leg: Leg) =>
  `${formatAsClock(leg.expectedStartTime)} ${leg.fromPlace.quay.name}${leg.fromPlace.quay.publicCode ? " " + leg.fromPlace.quay.publicCode : ""}`;

export const getLabelText = (leg: Leg, withTime: boolean = true) => {
  let label = "";
  if (leg.mode === "foot") {
    label += `${formatMetersToHuman(leg.distance)} `;
  }

  if (leg.line?.publicCode) {
    label += `${leg.line?.publicCode} `;
  }
  if (leg.fromEstimatedCall?.destinationDisplay) {
    label += `${formatDestinationDisplay(leg.fromEstimatedCall?.destinationDisplay)} `;
  }
  if (withTime) {
    label += `(${formatTimeDifferenceAsClock(leg.expectedEndTime, leg.expectedStartTime)})`;
  }
  return label;
};
