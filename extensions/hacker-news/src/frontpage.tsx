import { Action, ActionPanel, List } from "@raycast/api";
import { startCase } from "lodash";
import { getStories } from "./hackernews";
import { Topic } from "./types";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon, getAccessories } from "./utils";

export default function Command() {
  const [topic, setTopic] = useState<Topic | null>(Topic.FrontPage);
  const { data, isLoading } = useCachedPromise(getStories, [topic]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Page" storeValue onChange={(newValue) => setTopic(newValue as Topic)}>
          {Object.entries(Topic).map(([name, value]) => (
            <List.Dropdown.Item key={value} title={startCase(name)} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  return (
    <List.Item
      icon={getIcon(props.index + 1)}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessories={getAccessories(props.item)}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
        {props.item.guid && <Action.OpenInBrowser url={props.item.guid} title="Open Comments in Browser" />}
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
