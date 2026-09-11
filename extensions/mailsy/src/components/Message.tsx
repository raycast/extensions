import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useAccount } from "../hooks/useAccount";
import { getMessage, getMessageFilePath } from "../libs/api";
import { htmlToMarkdown } from "../libs/utils";

type MessageProps = {
  messageId: string;
};

export function Message({ messageId }: MessageProps): ReactElement {
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchMessage = useCallback(() => getMessage(messageId), [messageId, refreshKey]);
  const { data: message, isLoading, error } = useAccount(fetchMessage);

  const path = getMessageFilePath(messageId);
  const navigationTitle = message?.subject || "No Subject";
  const messageHtml = message?.html?.[0];
  const markdownContent = messageHtml ? htmlToMarkdown(messageHtml) : "# No Content";
  const markdown = error
    ? `# Failed to load message\n\n${error.message}`
    : message
      ? markdownContent
      : "# Loading message...";

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {message ? (
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`file://${path}`}
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            />
          ) : null}
          {error ? (
            <Action
              title="Retry"
              icon={{ source: Icon.ArrowClockwise, tintColor: Color.Blue }}
              onAction={() => setRefreshKey((prev) => prev + 1)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
