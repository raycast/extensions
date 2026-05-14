import { List, showToast, Toast } from "@raycast/api";
import React, { ReactElement, useEffect, useState } from "react";
import Parser from "rss-parser";
import addIcon from "./helpers/addIcon";
import { Actions } from "./Actions";
import type { ChangelogItem } from "./types";

const parser = new Parser();

interface State {
  items?: ChangelogItem[];
  error?: Error;
}

function formatPubDate(pubDate?: string): string {
  if (!pubDate) {
    return "";
  }

  const parts = pubDate.split(" ");
  return parts.length >= 4 ? parts.slice(0, 4).join(" ") : pubDate;
}

function ListItem(props: { item: ChangelogItem }) {
  const icon = addIcon(props.item.updateType);
  return (
    <List.Item
      accessoryIcon={"shopify_glyph.png"}
      accessoryTitle={formatPubDate(props.item.pubDate)}
      actions={<Actions item={props.item} />}
      icon={icon}
      title={props.item.title}
      subtitle={props.item.category}
    />
  );
}

export default function Command(): ReactElement {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const feed = await parser.parseURL("https://shopify.dev/changelog/feed.xml");
        const items: ChangelogItem[] = feed.items.map((story) => {
          return {
            title: story.title ?? "Untitled update",
            link: story.link,
            pubDate: story.pubDate,
            contentSnippet: story.contentSnippet,
            content: story.content,
            category: story?.categories?.[0],
            updateType: story?.categories?.[1],
          };
        });
        setState((previous) => ({
          ...previous,
          items: items,
        }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        }));
      }
    }
    fetchChangelog();
  }, []);

  useEffect(() => {
    if (state.error) {
      showToast(Toast.Style.Failure, "Fail to load changelog", state.error.message);
    }
  }, [state.error]);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <ListItem key={`${item.link ?? item.title}-${index}`} item={item} />
      ))}
    </List>
  );
}
