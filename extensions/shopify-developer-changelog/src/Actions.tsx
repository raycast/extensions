import { Action, ActionPanel } from "@raycast/api";
import React from "react";
import Parser from "rss-parser";
import { DescriptionPane } from "./DescriptionPane";
import { htmlToMarkdown } from "./helpers/htmlToMarkdown";

export function Actions(props: { item: any }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item && <Action.Push title="View Details" target={<DescriptionPane item={props.item} />} />}
      </ActionPanel.Section>
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function DescriptionPaneActions(props: { item: Parser.Item }) {
  const updateAsMarkdown = htmlToMarkdown(props.item.content, props.item.title);
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.contentSnippet && (
          <Action.CopyToClipboard
            content={props.item.contentSnippet}
            title="Copy Plaintext"
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        )}
        {updateAsMarkdown && (
          <Action.CopyToClipboard
            content={updateAsMarkdown}
            title="Copy Markdown"
            shortcut={{ modifiers: ["cmd"], key: ";" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
    </ActionPanel>
  );
}
