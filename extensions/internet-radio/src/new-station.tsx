import { dummyStation, EditStationForm } from "./utils";

export default function Command() {
  return (
    <EditStationForm
      stationName={""}
      stationData={dummyStation}
      setStations={() => {
        null;
      }}
    />
  );
}
