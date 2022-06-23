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
            icon={{ source: Icon.Circle }}
            accessoryTitle="Command"
            key={item.id}
            actions={
              <ActionPanel>
                <Action
                  title="Open Command"
                  onAction={() => {
                    pop();
                    if (props.type == ActionType.Switch) {
                      postAndCloseMainWindow(`switch-profile/${item.id}`);
                    } else {
                      postAndCloseMainWindow(`open-all-in-profile/${item.id}`);
                    }
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
