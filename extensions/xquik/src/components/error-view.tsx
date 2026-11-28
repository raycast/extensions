import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { SITE_URL } from "../lib/api";
import { describeError, ErrorFix } from "../lib/errors";

type ErrorViewProps = {
  error: Error;
  onRetry: () => void;
  firstAction?: ReactNode;
};

export function ErrorView({ error, onRetry, firstAction }: ErrorViewProps) {
  const { title, hint, fix } = describeError(error);
  const fixActions: Record<ErrorFix, ReactNode> = {
    preferences: (
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    ),
    site: <Action.OpenInBrowser title="Open Xquik" url={SITE_URL} />,
    retry: <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />,
  };
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description={hint}
      actions={
        <ActionPanel>
          {firstAction}
          {fixActions[fix]}
        </ActionPanel>
      }
    />
  );
}

export function ErrorScreen({ error, onRetry }: ErrorViewProps) {
  return (
    <List searchBarPlaceholder="Filter Results">
      <ErrorView error={error} onRetry={onRetry} />
    </List>
  );
}
