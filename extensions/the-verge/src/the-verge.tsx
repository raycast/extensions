import { Action, ActionPanel, List, showToast, Toast, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

interface State {
  items?: Parser.Item[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://www.theverge.com/rss/index.xml");
        setState({ items: feed.items });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchStories();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading stories",
      message: state.error.message,
    });
  }

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.id} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const points = getPoints(props.item);
  const comments = getComments(props.item);

  return (
    <List.Item
      icon={icon}
      title={
        `${props.item.title?.slice(0, 70)}${props.item.title && props.item.title.length > 70 ? "..." : ""}` ??
        "No title"
      }
      subtitle={props.item.author}
      accessories={[{ text: `${props.item.pubDate && new Date(props.item.pubDate).toLocaleDateString()}` }]}
      actions={<Actions item={props.item} />}
    />
  );
}

function getIcon(index: number): Image.ImageLike {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect x="0" y="0" width="40" height="40" fill="#450ADF" rx="10"></rect>
      <text
      font-size="22"
      fill="white"
      font-family="Verdana"
      text-anchor="middle"
      alignment-baseline="baseline"
      x="20.5"
      y="32.5">${index}</text>
    </svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

function getPoints(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Points:\s*)(\d+)/g);
  return matches?.[0];
}

function getComments(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Comments:\s*)(\d+)/g);
  return matches?.[0];
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel
      title={`${props.item.title?.slice(0, 50)}${props.item.title && props.item.title.length > 50 ? "..." : ""}`}
    >
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
