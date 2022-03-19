import { useEffect, useState } from "react";
import { List, showToast, Toast } from "@raycast/api";
import Parser from "rss-parser";
const parser = new Parser();

import { StoryListItem } from "./StoryListItem";

enum Topic {
  Frontpage = "frontpage",
  ShowHN = "show",
}

interface State {
  isLoading: boolean;
  items: Parser.Item[];
  topic: Topic | null;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ items: [], isLoading: true, topic: null });

  useEffect(() => {
    if (!state.topic) {
      return;
    }
    async function fetchStories() {
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const feed = await parser.parseURL(`https://hnrss.org/${state.topic}?count=100`);
        setState((previous) => ({ ...previous, items: feed.items, isLoading: false }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchStories();
  }, [state.topic]);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading stories",
        message: state.error.message,
      });
    }
  }, [state.error]);

  return (
    <List
      isLoading={(!state.items && !state.error) || state.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          storeValue
          onChange={(newValue) => setState((previous) => ({ ...previous, topic: newValue as Topic }))}
        >
          <List.Dropdown.Item title="Front Page" value={Topic.Frontpage} />
          <List.Dropdown.Item title="Show HN" value={Topic.ShowHN} />
        </List.Dropdown>
      }
    >
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}
