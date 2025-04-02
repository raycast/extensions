import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { startCase } from "lodash";
import { getStories } from "./hackernews";
import { Topic } from "./types";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon, getAccessories } from "./utils";
import { saveToReadwise, hasReadwiseToken, getSavedUrls } from "./readwise";

export default function Command() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const { data, isLoading } = usePromise(getStories, [topic], { execute: !!topic });

  // Load saved URLs from cache when component mounts
  useEffect(() => {
    setSavedUrls(getSavedUrls());
  }, []);

  // Function to handle saving to Readwise and updating UI
  const handleSaveToReadwise = async (url: string) => {
    const result = await saveToReadwise(url);
    // Show toast notification based on the result
    await showToast({
      style: result.success ? Toast.Style.Success : Toast.Style.Failure,
      title: result.message,
      message: result.isRateLimited ? "Please try again later" : result.error,
    });
    // Reload saved URLs
    if (result.success) {
      setSavedUrls(getSavedUrls());
    }
  };

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
        <StoryListItem
          key={item.guid}
          item={item}
          index={index}
          topic={topic}
          savedUrls={savedUrls}
          onSave={handleSaveToReadwise}
        />
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

function StoryListItem(props: {
  item: Parser.Item;
  index: number;
  topic: Topic | null;
  savedUrls: string[];
  onSave: (url: string) => Promise<void>;
}) {
  // Check if this item is in the savedUrls array
  const isSaved = props.item.link ? props.savedUrls.includes(props.item.link) : false;

  return (
    <List.Item
      icon={getIcon(props.index + 1)}
      title={setTitle(props.item.title || "No Title", props.topic || Topic.FrontPage)}
      subtitle={props.item.creator}
      accessories={getAccessories(props.item, isSaved)}
      actions={<Actions item={props.item} onSave={props.onSave} />}
    />
  );
}

function Actions(props: { item: Parser.Item; onSave: (url: string) => Promise<void> }) {
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
        {props.item.link && hasReadwiseToken() && (
          <Action
            icon={Icon.SaveDocument}
            title="Save to Readwise Reader"
            onAction={() => props.onSave(props.item.link || "")}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
