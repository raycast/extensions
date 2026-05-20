import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { ReactNode, useEffect } from "react";

const ErrorHandler = ({ error, children }: { error?: Error; children: ReactNode }) => {
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
        title={"Make sure your PostHog account is connected"}
        icon={Icon.Warning}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Person}
              title={"Manage Accounts"}
              onAction={() => launchCommand({ name: "accounts", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  ) : (
    children
  );
};

export default ErrorHandler;
