import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { APIError } from "../api";

// Directory search is only on for some accounts so far; everyone else gets a
// friendly note instead of an error toast.
export function DirectoryEmptyView({ error, noun, onRetry }: { error?: Error; noun: string; onRetry?: () => void }) {
  if (error instanceof APIError && error.needsElevatedAccess) {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title="Directory search isn't available for your account yet"
        description="You can still manage your own projects with My Projects and Add Project."
      />
    );
  }

  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title={`Couldn't load ${noun}`}
        description={error.message}
        actions={
          onRetry && (
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </ActionPanel>
          )
        }
      />
    );
  }

  return <List.EmptyView icon={Icon.MagnifyingGlass} title={`No ${noun} found`} />;
}

export function isExpected(error: Error) {
  return error instanceof APIError && error.needsElevatedAccess;
}
