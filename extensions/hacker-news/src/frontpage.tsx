import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { startCase } from "lodash";
import { getStories } from "./hackernews";
import { Topic } from "./types";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon, getAccessories } from "./utils";
import { OpenAIModule } from "./utils/summarizer";
import { getAccessToken } from "./utils/preferences";

const openAIKey = getAccessToken();

const openAI = openAIKey ? new OpenAIModule(openAIKey) : null;

export default function Command() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const { data, isLoading } = usePromise(getStories, [topic], { execute: !!topic });
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
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
          setIsShowingDetail={setIsShowingDetail}
          isShowingDetail={isShowingDetail}
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

function getWindowContent(title: string, topic: Topic) {
  const _title = setTitle(title, topic);
  const _informationContent = "To summarize the article, please press *'Cmd(⌘) + ['*.";
  return "# " + _title + "  \n" + _informationContent;
}

function StoryListItem(props: {
  item: Parser.Item;
  index: number;
  topic: Topic | null;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  isShowingDetail: boolean;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    if (!openAI) {
      throw new Error("openAI is not initialized");
    }
    if (props.item.link) {
      setIsLoading(true); // Show loading state
      try {
        const result = await openAI.summarizeArticle(props.item.link);
        setSummary(result);
      } catch (error) {
        console.error("Failed to fetch summary:", error);
      } finally {
        setIsLoading(false); // Hide loading state
      }
    }
  };

  return (
    <List.Item
      detail={
        <List.Item.Detail
          markdown={
            isLoading
              ? "*Loading...*"
              : summary || getWindowContent(props.item.title || "No Title", props.topic || Topic.FrontPage)
          }
        />
      }
      icon={getIcon(props.index + 1)}
      title={setTitle(props.item.title || "No Title", props.topic || Topic.FrontPage)}
      subtitle={props.item.creator}
      accessories={getAccessories(props.item)}
      actions={
        <Actions
          item={props.item}
          setIsShowingDetail={props.setIsShowingDetail}
          isShowingDetail={props.isShowingDetail}
          fetchSummary={fetchSummary}
        />
      }
    />
  );
}

function Actions(props: {
  item: Parser.Item;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  isShowingDetail: boolean;
  fetchSummary: () => Promise<void>;
}) {
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

      <ActionPanel.Section>
        <Action
          title="Toggle Summarize Window"
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={async () => {
            if (openAI != null) props.setIsShowingDetail((prev) => !prev);
            else
              await showToast({
                style: Toast.Style.Failure,
                title: "Cannot execute command",
                message: "To enable the summarize function, you should provide an openAI key on the preferences page.",
              });
          }}
        />
        {props.isShowingDetail && (
          <Action
            title="Summarize Article"
            onAction={async () => {
              props.fetchSummary();
            }}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
