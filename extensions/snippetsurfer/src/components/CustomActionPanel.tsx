import React, { ReactNode } from "react";
import { getPastableContent } from "../utils/SnippetsLoader";
import { Action, ActionPanel } from "@raycast/api";
import type { Snippet } from "../types";

const CustomActionPanel = ({
  handleAction,
  snippet,
  primaryAction,
}: {
  handleAction: (s: Snippet) => void;
  snippet: Snippet;
  primaryAction: string;
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
    <ActionPanel title="Actions">
      <ActionPanel.Section>{reorderedActions}</ActionPanel.Section>
    </ActionPanel>
  );
};

export default CustomActionPanel;
