import type { ReactElement } from "react";

import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

import { isAuthRelatedError, isInvalidTokenError, isMissingTokenError } from "./errors";

export type AuthErrorCopy = {
  title: string;
  description: string;
};

export function getAuthErrorCopy(error: Error): AuthErrorCopy | null {
  if (!isAuthRelatedError(error)) return null;

  const isMissingToken = isMissingTokenError(error);
  const isInvalidToken = isInvalidTokenError(error);

  return {
    title: isMissingToken
      ? "Add your Descript API token"
      : isInvalidToken
        ? "Invalid API token format"
        : "Authentication failed",
    description: isMissingToken
      ? "Paste a personal API token in the extension preferences to start using the Descript extension."
      : isInvalidToken
        ? error.message
        : "The configured token was rejected by Descript. Update it in extension preferences.",
  };
}

function authErrorActions(onReload?: () => void) {
  return (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {onReload ? <Action title="Reload" icon={Icon.ArrowClockwise} onAction={onReload} /> : null}
    </ActionPanel>
  );
}

export function renderAuthError(error: Error | undefined, onReload?: () => void): ReactElement | null {
  if (!error) return null;
  const copy = getAuthErrorCopy(error);
  if (!copy) return null;

  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title={copy.title}
        description={copy.description}
        actions={authErrorActions(onReload)}
      />
    </List>
  );
}
