import StopPoints from "./components/points";
import Lines from "./components/lines";
import Arrivals from "./components/arrivals";
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <StopPoints
      onSelectPoint={(point) => (
        <Lines
          stopPoint={point}
          onLineSelect={(line) => (
            <List searchBarPlaceholder={`Search for an arrival in ${line.commonName}`}>
              <Arrivals stopPointId={line.id} key={[line.id, 0].join("-")} />

              <List.EmptyView icon={Icon.Train} title="There are no arrivals expected" />
            </List>
          )}
        />
      )}
    />
  );
}
