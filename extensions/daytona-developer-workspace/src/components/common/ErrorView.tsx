/**
 * ErrorView Component
 * Reusable error display component with retry functionality
 */

import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { ErrorViewProps } from "../../types/ui";
import { ICONS, MESSAGES } from "../../lib/constants/ui";

export const ErrorView = React.memo<ErrorViewProps>(
  ({ error, onRetry, showDetails = false, showRetryButton = true, retryButtonText = "Try Again" }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorTitle = "Error Occurred";

    // Extract user-friendly error message
    const getUserFriendlyMessage = (message: string): string => {
      if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch")) {
        return MESSAGES.ERRORS.NETWORK;
      }
      if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("401")) {
        return MESSAGES.ERRORS.UNAUTHORIZED;
      }
      if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("404")) {
        return MESSAGES.ERRORS.NOT_FOUND;
      }
      if (message.toLowerCase().includes("timeout")) {
        return MESSAGES.ERRORS.TIMEOUT;
      }

      return message || MESSAGES.ERRORS.GENERIC;
    };

    const displayMessage = getUserFriendlyMessage(errorMessage);

    return (
      <List.EmptyView
        icon={ICONS.STATUS.ERROR}
        title={errorTitle}
        description={showDetails ? errorMessage : displayMessage}
        actions={
          showRetryButton && onRetry ? (
            <ActionPanel>
              <Action title={retryButtonText} icon={ICONS.ACTIONS.REFRESH} onAction={onRetry} />
              {showDetails && (
                <Action.CopyToClipboard title="Copy Error Details" content={errorMessage} icon={ICONS.ACTIONS.COPY} />
              )}
            </ActionPanel>
          ) : showDetails ? (
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Error Details" content={errorMessage} icon={ICONS.ACTIONS.COPY} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  },
);

ErrorView.displayName = "ErrorView";
