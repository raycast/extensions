import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { AUTOMATION_SETTINGS_URL } from "../constants";
import { normalizeAsideError } from "../lib/errors";

export function BrowserErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const asideError = normalizeAsideError(error);
  const title = {
    "not-installed": "Aside is not installed",
    "permission-denied": "Permission required",
    "no-window": "Aside has no usable window",
    "stale-tab": "Tab no longer exists",
    unknown: "Could not control Aside",
  }[asideError.kind];

  return (
    <List>
      <List.EmptyView
        icon={asideError.kind === "permission-denied" ? Icon.Lock : Icon.ExclamationMark}
        title={title}
        description={asideError.message}
        actions={
          <ActionPanel>
            {onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
            {asideError.kind === "permission-denied" ? (
              <Action
                title="Open Automation Settings"
                icon={Icon.Gear}
                onAction={() => open(AUTOMATION_SETTINGS_URL)}
              />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}
