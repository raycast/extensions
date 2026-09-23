/**
 * Failure state for the outdated-packages fetch, so a rejected fetch never
 * leaves the list blank or stuck on its loading placeholder.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { outdatedFetchFailureCopy } from "../utils";
import { ERROR_ICON } from "./palette";

export function OutdatedErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const copy = outdatedFetchFailureCopy(error);
  return (
    <List.EmptyView
      icon={ERROR_ICON}
      title={copy.title}
      description={copy.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
