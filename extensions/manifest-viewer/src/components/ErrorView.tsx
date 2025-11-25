import React from "react";
import { Grid, Icon, ActionPanel, Action } from "@raycast/api";

interface ErrorViewProps {
  message: string;
  url?: string;
  httpStatus?: number | null;
  manifestType?: string;
  onRetry?: () => void;
  actions?: React.ReactElement;
}

export default function ErrorView({ message, url, httpStatus, manifestType, onRetry, actions }: ErrorViewProps) {
  const getErrorTitle = () => {
    if (httpStatus) {
      return `Error when loading the manifest. Status code: ${httpStatus}`;
    }

    if (manifestType === "unknown") {
      return "Invalid Manifest";
    }

    return "Error Loading Manifest";
  };

  const getErrorDescription = () => {
    return "The loaded resource is not a valid manifest file";
  };

  const defaultActions = (
    <ActionPanel>
      {onRetry && (
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          onAction={onRetry}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      )}
      {url && (
        <>
          <Action.OpenInBrowser url={url} title="Open in Browser" />
          <Action.CopyToClipboard content={url} title="Copy URL" icon={Icon.Clipboard} />
        </>
      )}
      <Action.CopyToClipboard
        content={message}
        title="Copy Error Message"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
    </ActionPanel>
  );

  return (
    <Grid>
      <Grid.EmptyView title={getErrorTitle()} description={getErrorDescription()} actions={actions || defaultActions} />
    </Grid>
  );
}
