import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { GitHubError } from "../github/client";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function ErrorView({ error, onRetry }: Props) {
  const isAuth = error instanceof GitHubError && error.status === 401;
  const message = error instanceof Error ? error.message : "Unexpected error.";

  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={isAuth ? "Invalid GitHub token" : "GitHub request failed"}
        description={
          isAuth ? "Update your PAT in the extension preferences." : message
        }
        actions={
          <ActionPanel>
            {isAuth ? (
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            ) : (
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={onRetry}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
