import { Icon, List } from "@raycast/api";
import { IChild, IStopPoint } from "../types";
import Line from "./line";
import { ReactNode } from "react";

interface LinesProps {
  stopPoint: IStopPoint;
  onLineSelect: (line: IChild) => ReactNode;
}

export default function Lines({ onLineSelect, stopPoint }: LinesProps) {
  return (
    <List navigationTitle="Lines" searchBarPlaceholder={`Search for a station in ${stopPoint.commonName}`}>
      {stopPoint.children &&
        stopPoint.children.map((child) => (
          <Line child={child} onSelect={onLineSelect} key={[child.id, child.commonName, child.placeType].join("-")} />
        ))}

      <List.EmptyView icon={Icon.Train} title="There are no lines" />
    </List>
  );
}
