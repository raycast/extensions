import React, { ReactNode } from "react";
import { getPastableContent } from "../utils/SnippetsLoader";
import { Action, ActionPanel, Icon } from "@raycast/api";
import type { Snippet } from "../types";

const CustomActionPanel = ({
  handleAction,
  snippet,
  primaryAction,
  reloadSnippets,
  rootPath,
}: {
  handleAction: (s: Snippet) => void;
  snippet: Snippet;
  primaryAction: string;
  reloadSnippets: () => void;
  rootPath: string;
}) => {
  const actions = [
    <Action.CopyToClipboard
      content={getPastableContent(snippet.content?.content)}
      key="copy"
      onCopy={() => {
        handleAction(snippet);
      }}
    />,
    <Action.Paste
      content={getPastableContent(snippet.content?.content)}
      key="paste"
      onPaste={() => {
        handleAction(snippet);
      }}
    />,
  ];

  let reorderedActions = actions;
  if (primaryAction && primaryAction != "copyClipboard") {
    reorderedActions = reorderedActions.reverse();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">{reorderedActions}</ActionPanel.Section>
      <ActionPanel.Section title="Others">
        <Action.OpenWith title="Open Snippets Folder" path={rootPath} />
        <Action title="Reload Snippets" icon={Icon.RotateAntiClockwise} onAction={reloadSnippets} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default CustomActionPanel;
