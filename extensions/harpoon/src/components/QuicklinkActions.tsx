import { Action, ActionPanel, LaunchType } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

interface QuicklinkActionsProps {
  index: number;
}

export default function QuicklinkActions({ index }: QuicklinkActionsProps) {
  const position = index + 1;

  return (
    <ActionPanel.Section title="Create Quicklinks">
      <Action.CreateQuicklink
        quicklink={{
          link: createDeeplink({
            arguments: { position: `${position}` },
            command: "openApplicationByPosition",
            launchType: LaunchType.Background,
          }),
          name: `Harpoon: Open Application ${index + 1}`,
        }}
        title={`"Open Application ${index + 1}" Quicklink`}
      />
      <Action.CreateQuicklink
        quicklink={{
          link: createDeeplink({
            arguments: { position: `${position}` },
            command: "addApplicationByPosition",
            launchType: LaunchType.Background,
          }),
          name: `Harpoon: Add Application ${index + 1}`,
        }}
        title={`"Add Application ${index + 1}" Quicklink`}
      />
    </ActionPanel.Section>
  );
}
