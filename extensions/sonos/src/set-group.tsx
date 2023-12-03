import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { useSonos } from "./sonos";
import { setActiveGroup } from "./storage";

export default function SetActiveGroupCommand() {
  const { availableGroups, activeGroup } = useSonos();

  return (
    <List filtering={false}>
      {availableGroups === undefined
        ? null
        : Array.from(availableGroups).map((group) => (
            <List.Item
              key={group}
              title={group}
              icon={Icon.SpeakerOn}
              accessories={
                group === activeGroup
                  ? [
                      {
                        icon: Icon.Checkmark,
                        text: "Active",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    onAction={async () => {
                      await setActiveGroup(group);
                      await showToast({
                        title: `Now controlling "${group}"`,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
