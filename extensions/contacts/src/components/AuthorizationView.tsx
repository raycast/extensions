import { List, Icon, ActionPanel, Action, open } from "@raycast/api";
import { ErrorResponse } from "../types";

interface AuthorizationViewProps {
  error: ErrorResponse;
  onRetry: () => void;
}

export function AuthorizationView({ error, onRetry }: AuthorizationViewProps) {
  const isAuthError = error.type === "authorization";
  const title = isAuthError ? "Permission Required" : "Error Fetching Contacts";
  const icon = isAuthError ? Icon.Lock : Icon.ExclamationMark;

  let description = error.message;
  if (isAuthError) {
    description = "Raycast needs permission to access your contacts. Please grant access in System Preferences.";
  }

  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action
            title="Open System Preferences"
            icon={Icon.Gear}
            onAction={async () => {
              // Open System Preferences to Contacts permissions
              const url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts";
              try {
                await open(url);
              } catch (error) {
                console.error("Failed to open System Preferences:", error);
              }
            }}
          />
          <Action title="Retry" icon={Icon.RotateClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
