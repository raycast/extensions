import { ActionPanel, Action, Icon, LaunchType } from "@raycast/api";
import { useNavigation } from "@raycast/api";

interface CreateActionsProps {
  push: (component: React.ReactElement) => void;
}

/**
 * Reusable action panel section for creating new secrets and requests
 */
export function CreateActions({ push }: CreateActionsProps) {
  return (
    <ActionPanel.Section>
      <Action
        title="Create New Secret"
        icon={Icon.Plus}
        onAction={() => {
          import("../commands/new-secret").then(({ default: NewSecret }) => {
            push(<NewSecret launchType={LaunchType.UserInitiated} arguments={{}} />);
          });
        }}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action
        title="Create New Request"
        icon={Icon.Plus}
        onAction={() => {
          import("../commands/new-secret-request").then(({ default: NewSecretRequest }) => {
            push(<NewSecretRequest />);
          });
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      />
    </ActionPanel.Section>
  );
}

/**
 * Hook to get navigation push function for use with CreateActions
 */
export function useCreateActions() {
  const { push } = useNavigation();
  return { push };
}
