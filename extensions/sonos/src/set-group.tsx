import { Action, ActionPanel, Detail, Icon, List, popToRoot, showToast } from "@raycast/api";
import { useSonos } from "./core/hooks";
import { setActiveGroup } from "./core/storage";
import { NoSystemContent } from "./core/utils";

export default function SetActiveGroupCommand() {
  const { availableGroups, activeGroup, systemDetected, detectionError } = useSonos();

  if (!systemDetected) {
    const errorDetails =
      detectionError === null
        ? ""
        : `\n\n\n---\n\n**Debug: caught error**\n\n\`\`\`\n${
            detectionError instanceof Error
              ? `${detectionError.message}\n\n${detectionError.stack}`
              : String(detectionError)
          }\n\`\`\``;

    return <Detail isLoading={false} markdown={NoSystemContent + errorDetails} />;
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
