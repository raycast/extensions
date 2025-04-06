import { getPreferences } from "#/helpers/raycast";
import { withToast } from "#/helpers/toast";
import { Action, Icon } from "@raycast/api";

export const RefreshWorktrees = ({ revalidate }: { revalidate: () => void }) => {
  const { enableWorktreeCaching } = getPreferences();

  if (enableWorktreeCaching) return null;

  return (
    <Action
      title="Refresh"
      shortcut={{ key: "r", modifiers: ["cmd"] }}
      icon={Icon.ArrowClockwise}
      onAction={withToast({
        action: () => revalidate(),
        onSuccess: () => `Refreshing repos and worktrees`,
        onFailure: () => `Failed to refresh repos and worktrees`,
      })}
    />
  );
};
