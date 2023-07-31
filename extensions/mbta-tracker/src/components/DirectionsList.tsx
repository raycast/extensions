import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { StopsList } from "./StopsList";
import type { Route } from "../types";

interface Props {
  route: Route;
}

export const renderDirectionIcon = (direction: string): Icon => {
  switch (direction) {
    case "Outbound":
      return Icon.ArrowsExpand;
    case "Inbound":
      return Icon.ArrowsContract;
    case "North":
      return Icon.ArrowUp;
    case "South":
      return Icon.ArrowDown;
    case "West":
      return Icon.ArrowLeft;
    case "East":
      return Icon.ArrowRight;
  }
  return Icon.Compass;
};

export const DirectionsList = ({ route }: Props): JSX.Element => {
  return (
    <List searchBarPlaceholder="Select travel direction...">
      <List.Item
        key={route.attributes.direction_destinations[0]}
        title={route.attributes.direction_names[0]}
        icon={renderDirectionIcon(route.attributes.direction_names[0])}
        accessories={[
          {
            text: route.attributes.direction_destinations[0],
            icon: Icon.Pin,
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Choose Travel Direction"
              icon={Icon.Map}
              target={<StopsList key={route.id} route={route} directionId="0" />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        key={route.attributes.direction_destinations[1]}
        title={route.attributes.direction_names[1]}
        icon={renderDirectionIcon(route.attributes.direction_names[1])}
        accessories={[
          {
            text: route.attributes.direction_destinations[1],
            icon: Icon.Pin,
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Choose Travel Direction"
              icon={Icon.Map}
              target={<StopsList key={route.id} route={route} directionId="1" />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
};
