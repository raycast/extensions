import { Action, ActionPanel, List, Detail, Icon } from "@raycast/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { add, eachDayOfInterval, format, formatDuration, intervalToDuration, isToday, isTomorrow } from "date-fns";
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

const DATE_FORMAT = "yyyy-MM-dd";
const TIMES_INITIAL_STATE = { data: undefined, error: false };

const DayDropdown = (props: { onDayTypeChange: (newValue: string) => void }) => {
  const { onDayTypeChange } = props;

  const dates = eachDayOfInterval({
    start: new Date(),
    end: add(new Date(), { days: 6 }),
  }).map((date) => {
    let title = format(date, "EEEE dd.MM");
    if (isToday(date)) {
      title = "Today";
    } else if (isTomorrow(date)) {
      title = "Tomorrow";
    }
    return {
      title,
      value: format(date, DATE_FORMAT),
    };
  });

  return (
    <List.Dropdown
      tooltip="Select day"
      defaultValue={dates[0].value}
      onChange={(newValue) => {
        onDayTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Day">
        {dates.map(({ title, value }) => (
          <List.Dropdown.Item key={value} title={title} value={value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
const Times: React.FC<Props> = ({ destinationStopAreaId, originStopAreaId, route }) => {
  const [times, setTimes] = useState<JourneysResult>(TIMES_INITIAL_STATE);
  const [day, setDay] = useState<string>(format(new Date(), DATE_FORMAT));

  useEffect(() => {
    const fetchTimes = async () => {
      setTimes(TIMES_INITIAL_STATE);
      const response = await axios.put(`https://api.ridango.com/v2/64/intercity/stopareas/trips/direct`, {
        channel: "web",
        date: day,
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
  }, [day]);

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
      <List
        isLoading={!times.data && !times.error}
        navigationTitle={`${route}: Show Times`}
        searchBarAccessory={<DayDropdown onDayTypeChange={setDay} />}
      >
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
