import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { StopsList } from "./StopsList";
import type { Route } from "../types";

interface Props {
  route: Route;
}

const directionIds = [0, 1];

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
      {directionIds.map((directionId) => (
        <List.Item
          key={route.attributes.direction_destinations[directionId]}
          title={
            route.attributes.direction_names[directionId].endsWith("bound")
              ? route.attributes.direction_names[directionId]
              : `${route.attributes.direction_names[directionId]}bound`
          }
          icon={renderDirectionIcon(route.attributes.direction_names[directionId])}
          accessories={[
            {
              text: `Toward ${route.attributes.direction_destinations[directionId]}`,
              icon: Icon.Pin,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Travel Direction"
                icon={Icon.Map}
                target={<StopsList key={route.id} route={route} directionId={directionId} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
