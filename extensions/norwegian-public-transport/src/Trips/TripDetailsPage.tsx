import { Color, Icon, List } from "@raycast/api";
import { formatAsClock, formatAsDate, formatMillisecondsToHuman, getTransportIcon } from "../utils";
import { getLabelText } from "./TripsPage";
import { getTitleText } from "./TripsPage";
import { Detail } from "../Departures/Detail";
import { TripPattern } from "../api/tripsQuery";

type Props = {
  trip: TripPattern;
};
export default function TripDetailsPage({ trip }: Props) {
  const date = formatAsDate(trip.expectedStartTime);
  const fromPlace = trip.legs[0].fromPlace;
  const toPlace = trip.legs[trip.legs.length - 1].toPlace;
  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder={`From ${fromPlace.quay.name} to ${toPlace.quay.name}...`}
    >
      <List.Section title={date === new Date().toDateString() ? "Today" : date}>
        {trip.legs.map((leg, idx) => (
          <List.Item
            key={idx}
            title={getTitleText(leg)}
            accessories={[
              {
                text: getLabelText(leg, false),
                icon: getTransportIcon(leg.mode, leg.transportSubmode),
              },
            ]}
            detail={
              leg.fromEstimatedCall && (
                <Detail ec={leg.fromEstimatedCall} destinationQuayId={leg.toPlace.quay.id} />
              )
            }
          />
        ))}
        <List.Item
          title={`${formatAsClock(trip.expectedEndTime)} ${toPlace.quay.name} ${toPlace.quay.publicCode || ""}`}
          accessories={[{ icon: { source: Icon.Pin, tintColor: Color.SecondaryText } }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Estimated arrival"
                    text={
                      new Date(trip.expectedEndTime).toLocaleDateString("no-no") +
                      " " +
                      new Date(trip.expectedEndTime).toLocaleTimeString("no-no")
                    }
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Total duration"
                    text={formatMillisecondsToHuman(trip.duration * 1000)}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
    </List>
  );
}
