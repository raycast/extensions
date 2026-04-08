import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";

import { getVikunjaErrorMessage } from "../lib/errors";

export function VikunjaErrorView(props: {
  error: unknown;
  onRetry: () => Promise<void> | void;
  title: string;
}) {
  return (
    <List.EmptyView
      title={props.title}
      description={getVikunjaErrorMessage(props.error)}
      icon={Icon.ExclamationMark}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            onAction={props.onRetry}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
