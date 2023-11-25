import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import Parser from "rss-parser";
import url from "url";

const parser = new Parser();

interface State {
  items?: story[];
  error?: Error;
}

type story = {
  title: any;
  link: any;
  hostname: any;
};

export default function Command(): ReactElement {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://www.designernews.co/?format=rss");
        const items = feed.items.map((story) => {
          const hostname = story.contentSnippet && url.parse(story.contentSnippet).hostname;
          return {
            title: story.title,
            link: story.contentSnippet,
            hostname: hostname?.replace(/^www\./, ""),
          };
        });
        setState({ ...state, items: items });
      } catch (error) {
        setState({ ...state, error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchStories();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, "Failed loading stories", state.error.message);
  }

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={index} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: story; index: number }) {
  return (
    <List.Item
      title={props.item.title ?? "No title"}
      accessoryTitle={props.item.hostname}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
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
