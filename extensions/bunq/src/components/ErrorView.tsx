/**
 * Shared error view component
 */

import { Action, ActionPanel, Detail } from "@raycast/api";

interface ErrorViewProps {
  /** The title displayed in the error heading */
  title: string;
  /** The error message to display */
  message: string;
  /** Callback for the "Retry" action */
  onRetry?: () => void;
  /** Callback for the "Refresh Session" action */
  onRefreshSession?: () => void;
}

/**
 * Displays an error view with retry and refresh session actions
 */
export function ErrorView({ title, message, onRetry, onRefreshSession }: ErrorViewProps) {
  return (
    <Detail
      markdown={`# ${title}

${message}

Try refreshing the session or reconnecting.`}
      actions={
        <ActionPanel>
          {onRetry && <Action title="Retry Loading" onAction={onRetry} />}
          {onRefreshSession && <Action title="Refresh Session" onAction={onRefreshSession} />}
        </ActionPanel>
      }
    />
  );
}
