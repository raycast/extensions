import { ActionPanel, List, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React from 'react';
import Parser from 'rss-parser';
import getStories from "./arsTechnica";


export default function Command() {
  const { data, isLoading } = usePromise(getStories);

  return (
    <List>
        isLoading={isLoading}
        {data?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}


function StoryListItem(props: { item: Parser.Item; index: number }) {
  return (
    <List.Item
      title={props.item.title as string}
      subtitle={props.item.creator}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
      </ActionPanel.Section>
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