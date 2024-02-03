import { Action, ActionPanel, Icon, List, popToRoot, showToast } from "@raycast/api";
import { setActiveGroup } from "./core/storage";
import { useSonos } from "./core/hooks";

export default function SetActiveGroupCommand() {
  const { availableGroups, activeGroup } = useSonos();

  return (
    <List filtering={false} navigationTitle="Which group would you like to control?">
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

                      await popToRoot();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
