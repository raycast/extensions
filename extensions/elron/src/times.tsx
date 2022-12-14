import { Action, ActionPanel, List, Detail, Icon } from "@raycast/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { format, formatDuration, intervalToDuration } from "date-fns";
import Stops from "./stops";

interface Props {
  originStopAreaId: string;
  destinationStopAreaId: string;
  route: string;
}

interface JourneysResult {
  data:
    | {
        journeys: [
          {
            journey_name: string;
            trips: Trip[];
          }
        ];
      }
    | undefined;
  error: boolean;
}

interface Trip {
  id: number;
  departure_time: string;
  arrival_time: string;
}

const Times: React.FC<Props> = ({ destinationStopAreaId, originStopAreaId, route }) => {
  const [times, setTimes] = useState<JourneysResult>({ data: undefined, error: false });

  useEffect(() => {
    const fetchTimes = async () => {
      const response = await axios.put(`https://api.ridango.com/v2/64/intercity/stopareas/trips/direct`, {
        channel: "web",
        date: format(new Date(), "yyyy-MM-dd"),
        destination_stop_area_id: destinationStopAreaId,
        origin_stop_area_id: originStopAreaId,
      });

      if (response.status !== 200) {
        setTimes({ data: undefined, error: true });
        return;
      }

      setTimes({ data: response.data, error: false });
    };
    fetchTimes();
  }, []);

  const formatTitle = (trip: Trip) => {
    const { departure_time, arrival_time } = trip;

    const dep = format(new Date(departure_time), "HH:mm");
    const arr = format(new Date(arrival_time), "HH:mm");

    const duration = formatDuration(
      intervalToDuration({
        start: new Date(departure_time),
        end: new Date(arrival_time),
      })
    );

    return {
      long: `${dep} - ${arr} (${duration})`,
      short: `${dep} - ${arr}`,
      duration,
    };
  };

  if (times.error) {
    // Define markdown here to prevent unwanted indentation.
    const markdown = `
# Something went wrong!
There was an error fetching the train times. Please try again later.
`;
    return <Detail markdown={markdown} />;
  }

  return (
    <>
      <List isLoading={!times.data && !times.error} navigationTitle={`${route}: Show Times`}>
        <List.EmptyView title={`No more departures today`} />
        {times?.data?.journeys
          .filter((journey) => {
            const dep = new Date(journey.trips[0].departure_time);
            return dep > new Date();
          })
          .map((journey) => {
            const trip = journey.trips[0];
            return (
              <List.Item
                key={trip.id}
                title={formatTitle(trip).short}
                subtitle={{ tooltip: "Duration", value: formatTitle(trip).duration }}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Stops"
                      icon={Icon.Train}
                      target={<Stops tripId={trip.id} title={`${route}: Show Stops`} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List>
    </>
  );
};

export default Times;
