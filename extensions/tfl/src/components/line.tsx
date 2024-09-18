import { ReactNode } from "react";
import { IChild } from "../types";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface LineProp {
  child: IChild;
  onSelect: (line: IChild) => ReactNode;
}

export default function Line({ onSelect, child }: LineProp) {
  return (
    <List.Item
      icon={Icon.Geopin}
      title={child.commonName}
      keywords={[child.commonName, child.id]}
      accessories={[
        {
          icon: Icon.ArrowRight,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Departures" target={onSelect(child)} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    />
  );
}
