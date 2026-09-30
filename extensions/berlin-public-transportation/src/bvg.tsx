import Stations from "./components/stations";
import Departures from "./components/departures";

export default function Command() {
  return <Stations onSelectStation={(station) => <Departures station={station} />} />;
}
