import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import { useAuthState } from "../hooks/useAuthState";

interface AuthenticationErrorProps {
  error?: string;
  onRetry?: () => void;
}

export function AuthenticationError({ error, onRetry }: AuthenticationErrorProps) {
  const { reAuthenticate } = useAuthState();

  const handleReAuthenticate = async () => {
    await reAuthenticate();
    onRetry?.();
  };

  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Spotify Authentication Required"
      description={
        error ||
        "Your Spotify session has expired. This can happen after periods of inactivity or when refresh tokens expire."
      }
      actions={
        <ActionPanel>
          <Action
            title="Re-Authenticate with Spotify"
            icon={Icon.RotateClockwise}
            onAction={handleReAuthenticate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Open Spotify Web"
            icon={Icon.Globe}
            onAction={() => {
              // Open Spotify web to ensure user is logged in
              exec("open https://open.spotify.com");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function withAuthenticationError<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  checkAuth: () => boolean = () => true,
): React.ComponentType<T> {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isInitializing, lastAuthError } = useAuthState();

    if (isInitializing) {
      return <List isLoading={true} />;
    }

    if (!isAuthenticated || !checkAuth()) {
      return (
        <List>
          <AuthenticationError error={lastAuthError || undefined} onRetry={() => window.location.reload()} />
        </List>
      );
    }

    return <Component {...props} />;
  };
}
