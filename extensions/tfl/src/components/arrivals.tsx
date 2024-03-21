import useSWR from "swr";
import { getArrivals } from "../lib/api";
import { List } from "@raycast/api";
import Arrival from "./arrival";

interface ArrivalsProps {
  stopPointId: string;
}

export default function Arrivals({ stopPointId }: ArrivalsProps) {
  const { data, isLoading, mutate } = useSWR("arrivals", () => getArrivals(stopPointId));

  return (
    <List.Section title="Arrivals">
      {data &&
        !isLoading &&
        data.map((arrival) => (
          <Arrival
            arrival={arrival}
            onRefresh={() => {
              mutate();
            }}
            key={[arrival.id, arrival.lineId, arrival.stationName, arrival.timeToStation].join("-")}
          />
        ))}
    </List.Section>
  );
}
