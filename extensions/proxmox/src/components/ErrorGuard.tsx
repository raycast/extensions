import type { PropsWithChildren } from "react";
import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

type ErrorGuardProps = PropsWithChildren<{
  showErrorScreen?: boolean;
}>;

export const ErrorGuard = ({ children, showErrorScreen }: ErrorGuardProps) => {
  if (showErrorScreen) {
    return (
      <Detail
        markdown="Something went wrong, check your preferences."
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return children;
};
