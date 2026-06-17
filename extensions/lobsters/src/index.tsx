import { useEffect, useState } from "react";
import Parser from "rss-parser";
import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageMask,
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
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
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
  const { broughtBy, nickname } = getBroughtBy(item.creator);
  const icon = getIcon(nickname);
  const keywords = [...(item?.categories ?? []), nickname];

  return (
    <List.Item
      icon={icon}
      title={item.title ?? "No title"}
      subtitle={item.categories?.join(", ")}
      keywords={keywords}
      accessoryTitle={broughtBy}
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

function getIcon(nickname: string) {
  return {
    source: `https://lobste.rs/avatars/${nickname}-100.png`,
    mask: ImageMask.Circle,
  };
}

function getBroughtBy(creator: string) {
  let nickname = "untitled";

  if (creator.includes(" via ")) {
    nickname = creator.split(" via ")?.[1];
  } else if (creator.includes(" by ")) {
    nickname = creator.split(" by ")?.[1];
  }

  return {
    broughtBy: creator + "🦞",
    nickname,
  };
}
