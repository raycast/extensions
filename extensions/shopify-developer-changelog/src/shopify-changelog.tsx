import { List, showToast, Toast } from "@raycast/api";
import React, { ReactElement, useEffect, useState } from "react";
import Parser from "rss-parser";
import addIcon from "./helpers/addIcon";
import { Actions } from "./Actions";

const parser = new Parser();

interface State {
  items?: story[];
  error?: Error;
}

type story = {
  title: any;
  link: any;
  pubDate: any;
  content: any;
  contentSnippet: any;
  category: any;
  updateType: any;
};

function ListItem(props: { item: story; index: number }) {
  const icon = addIcon(props);
  return (
    <List.Item
      accessoryIcon={"shopify_glyph.png"}
      accessoryTitle={props.item.pubDate.toString().split(" ").slice(0, 4).join(" ")}
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
        const items = feed.items.map((story) => {
          return {
            title: story.title,
            link: story.link,
            pubDate: story.pubDate,
            contentSnippet: story.contentSnippet?.toString(),
            content: story.content?.toString(),
            category: story?.categories?.[0],
            updateType: story?.categories?.[1],
          };
        });
        setState({
          ...state,
          items: items,
        });
      } catch (error) {
        setState({
          ...state,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }
    fetchChangelog();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, "Fail to load changelog", state.error.message);
  }

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <ListItem key={index} item={item} index={index} />
      ))}
    </List>
  );
}
