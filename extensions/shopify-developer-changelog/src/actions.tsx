import { Action, ActionPanel, Detail } from "@raycast/api";
import React from "react";
import addIcon from "./addIcon";
import Parser from "rss-parser";

function ViewAction(props: { item: Parser.Item }) {
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
            title="Copy Update"
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
    </ActionPanel>
  );
}

function DescriptionPane(props: { item: any }) {
  const icon = addIcon(props);
  let formattedOutput = `# ${props.item.title}\n\n  `;
  const contentArray = props.item.contentSnippet.split("\n");
  for (let i = 0; i < contentArray.length; i++) {
    if (contentArray[i].length < 50) {
      formattedOutput += ` ## ${contentArray[i]}\n  `;
    } else {
      formattedOutput += ` \n  ${contentArray[i]}  \n `;
    }
  }
  formattedOutput += `\n\n  ----  \n\n  ${icon} ${props.item.category}  -  ${props.item.pubDate}  -  [Link](${props.item.link})`;
  return (
    <Detail markdown={formattedOutput} navigationTitle={props.item.title} actions={<ViewAction item={props.item} />} />
  );
}

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
