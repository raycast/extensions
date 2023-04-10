import { Action, ActionPanel, List } from "@raycast/api";
import { startCase } from "lodash";
import { getStories } from "./hackernews";
import { Topic } from "./types";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon, getAccessories } from "./utils";

export default function Command() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const { data, isLoading } = usePromise(getStories, [topic], { execute: !!topic });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={Topic.FrontPage}
          storeValue
          onChange={(newValue) => setTopic(newValue as Topic)}
        >
          {Object.entries(Topic).map(([name, value]) => (
            <List.Dropdown.Item key={value} title={startCase(name)} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} topic={topic} />
      ))}
    </List>
  );
}

function setTitle(title: string, topic: Topic) {
  if (topic === Topic.ShowHN) {
    return title.replace(/Show HN: /, "");
  }
  if (topic === Topic.AskHN) {
    return title.replace(/Ask HN: /, "");
  }
  if (topic === Topic.Polls) {
    return title.replace(/Poll: /, "");
  }
  return title;
}

function StoryListItem(props: { item: Parser.Item; index: number; topic: Topic | null }) {
  return (
    <List.Item
      icon={getIcon(props.index + 1)}
      title={setTitle(props.item.title || "No Title", props.topic || Topic.FrontPage)}
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
