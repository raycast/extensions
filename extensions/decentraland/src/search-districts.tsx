import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDistricts } from "./hooks";
import { DECENTRALAND_PLAY_URL } from "./constants";

function buildPlayDecentralandUrl(position: string) {
  return `${DECENTRALAND_PLAY_URL}?position=${position}`;
}

export default function Command() {
  const { isLoading, districts } = useDistricts();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search districts">
      {districts.map((district) => {
        return (
          <List.Item
            icon={Icon.Pin}
            key={district.id}
            title={district.name}
            subtitle={district.description}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon="command-icon.png"
                  title="Open in Decentraland"
                  url={buildPlayDecentralandUrl(district.parcels[0])}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
