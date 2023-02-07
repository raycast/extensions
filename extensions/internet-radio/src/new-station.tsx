import { EditStationForm } from "./utils";

export default function Command() {
  const dummyStation = {
    website: "",
    stream: "",
    genres: [],
  };
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
