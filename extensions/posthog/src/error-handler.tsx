import { Action, ActionPanel, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useEffect } from "react";

const ErrorHandler = ({ error, children }: { error?: Error; children: JSX.Element }): JSX.Element => {
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Network request failed",
        message: error.message,
      });
    }
  }, [error]);

  return error ? (
    <List>
      <List.EmptyView
        title={"Make sure your API key and data region are correct"}
        icon={Icon.Warning}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title={"Open Extension Preferences"} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  ) : (
    children
  );
};

export default ErrorHandler;
