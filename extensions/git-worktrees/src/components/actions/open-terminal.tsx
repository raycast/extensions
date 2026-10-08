import { getPreferences } from "#/helpers/raycast";
import { withToast } from "#/helpers/toast";
import { Action, open } from "@raycast/api";

export const OpenTerminal = ({ path }: { path?: string }) => {
  const { terminalApp } = getPreferences();

  if (!terminalApp || !path) return null;

  return (
    <Action
      title={`Open in ${terminalApp.name}`}
      icon={{ fileIcon: terminalApp.path }}
      onAction={withToast({
        action: () => {
          return open(path, terminalApp.bundleId);
        },
        onSuccess: () => `Opening in ${terminalApp.name}`,
        onFailure: () => `Failed to open in ${terminalApp.name}`,
      })}
    />
  );
};
