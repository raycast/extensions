import { Action, ActionPanel, Detail, Icon, List, popToRoot, showToast } from "@raycast/api";
import { useSonos } from "./core/hooks";
import { setActiveGroup } from "./core/storage";
import { NoSystemContent } from "./core/utils";

export default function SetActiveGroupCommand() {
  const { availableGroups, activeGroup, systemDetected } = useSonos();

  if (!systemDetected) {
    return <Detail isLoading={false} markdown={NoSystemContent} />;
  }

  return (
    <List navigationTitle="Which group would you like to control?">
      {!availableGroups
        ? null
        : availableGroups.map((group) => (
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
