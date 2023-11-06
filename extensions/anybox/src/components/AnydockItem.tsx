import { ActionPanel, Action, List, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { postAndCloseMainWindow, fetchProfiles, AnydockProfile } from "../utilities/fetch";

export enum ActionType {
  Switch = 1,
  OpenAll,
}

interface ProfileProps {
  type: ActionType;
}

export default function Profiles(props: ProfileProps) {
  const [profiles, setProfiles] = useState<AnydockProfile[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    fetchProfiles().then((profiles) => {
      if (Array.isArray(profiles)) {
        setProfiles(profiles);
      }
    });
  }, []);

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {profiles.map((item) => {
        return (
          <List.Item
            title={item.name}
            subtitle="Anybox"
            icon={{
              source: `http://127.0.0.1:6391/sf-symbols/${item.icon}`,
              fallback: Icon.Coins,
              tintColor: {
                light: "#505151",
                dark: "#ffffff",
                adjustContrast: true,
              },
            }}
            accessories={[{ text: "Command" }]}
            key={item.id}
            actions={
              <ActionPanel>
                <Action
                  title="Open Command"
                  onAction={async () => {
                    if (props.type == ActionType.Switch) {
                      await postAndCloseMainWindow(`switch-profile/${item.id}`);
                    } else {
                      await postAndCloseMainWindow(`open-all-in-profile/${item.id}`);
                    }
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
