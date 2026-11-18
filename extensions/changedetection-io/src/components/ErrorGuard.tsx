import type { PropsWithChildren } from "react";
import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type ErrorGuardProps = PropsWithChildren<{
  error?: Error;
}>;

export const ErrorGuard = ({ children, error }: ErrorGuardProps) => {
  if (error) {
    showFailureToast(error, { title: "Error while fetching data" });
    const errorMessage = error?.message?.toLowerCase().includes("not found")
      ? "Cannot find the instance, is your URL correct?"
      : error.message;
    return (
      <Detail
        markdown={`Something went wrong, check your preferences.\n\n>Error: ${errorMessage}`}
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
