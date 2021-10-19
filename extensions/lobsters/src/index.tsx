import { useEffect, useState } from "react";
import Parser from "rss-parser";
import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
} from "@raycast/api";

const parser = new Parser();

type ParsedItem = {
  creator: string;
  link: string;
  title: string;
  guid: string;
  categories: string[];
};

type State = {
  items?: ParsedItem[];
  error?: Error;
};

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://lobste.rs/rss");
        setState({ items: feed.items as ParsedItem[] });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    void fetchStories();
  }, []);

  if (state.error) {
    void showToast(ToastStyle.Failure, "Failed loading stories", state.error.message);
  }

  const isLoading = !state.items && !state.error;

  return (
    <List isLoading={isLoading}>
      {state.items?.map((item) => (
        <StoryListItem key={item.guid} item={item} />
      ))}
    </List>
  );
}

function StoryListItem({ item }: { item: ParsedItem }) {
  const icon = getIcon();
  const author = getAuthor(item.creator);

  return (
    <List.Item
      icon={icon}
      title={item.title ?? "No title"}
      subtitle={item.categories?.join(", ")}
      keywords={item.categories}
      accessoryTitle={author}
      actions={<Actions title={item.title} link={item.link} guid={item.guid} />}
    />
  );
}

type ActionItem = Pick<ParsedItem, "title" | "link" | "guid">;

function Actions({ title, link, guid }: ActionItem) {
  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        {link && <OpenInBrowserAction url={link} />}
        {guid && <OpenInBrowserAction url={guid} title="Open Comments in Browser" />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {link && <CopyToClipboardAction content={link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function randomNum(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getIcon() {
  const colors = ["Brown", "Green", "Orange", "PrimaryText", "Purple", "Red", "SecondaryText"];

  return { source: Icon.Document, tintColor: colors[randomNum(0, colors?.length)] };
}

function getAuthor(creator: string) {
  const author = creator?.match(/\((.*)\)/)?.[1];

  return author ? `by ${author} 🦞` : "untitled";
}
