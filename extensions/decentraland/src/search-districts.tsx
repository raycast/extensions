import { Action, ActionPanel, List } from "@raycast/api";
import { useDistricts } from "./hooks";
import { DECENTRALAND_PLAY_URL } from "./constants";

function buildPlayDecentralandUrl(position: string) {
  return `${DECENTRALAND_PLAY_URL}?position=${position}`;
}

export default function Command() {
  const { districts } = useDistricts();

  return (
    <List>
      {districts &&
        districts?.map((district) => {
          return (
            <List.Item
              icon={"location.svg"}
              key={district.id}
              title={district.name}
              subtitle={district.description}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
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
