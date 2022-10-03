import { List } from "@raycast/api";
import useStations from "./services/GIOS";
import { getPreferenceValues } from "@raycast/api";
import StationDetails from "./components/StationDetails";
import { IStationResult } from "./types";

interface Preferences {
  city: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { stations, isLoading } = useStations(preferences.city);
  return (
    <List navigationTitle={`Airsy - Stations from ${preferences.city}`} isLoading={isLoading} isShowingDetail>
      {stations &&
        stations.map((station: IStationResult) => {
          return (
            <List.Item key={station.id} title={station.stationName} detail={<StationDetails station={station} />} />
          );
        })}
    </List>
  );
}
