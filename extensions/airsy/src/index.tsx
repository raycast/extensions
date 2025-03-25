import { List } from "@raycast/api";
import useStations from "./services/GIOS";
import StationDetails from "./components/StationDetails";
import { IStationResult } from "./types";

export default function Command() {
  const { stations, isLoading } = useStations();
  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title={`All Stations`} subtitle={stations?.length.toString()}>
        {stations &&
          stations.map((station: IStationResult) => {
            return (
              <List.Item key={station.id} title={station.stationName} detail={<StationDetails station={station} />} />
            );
          })}
      </List.Section>
    </List>
  );
}
