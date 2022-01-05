import { List, showToast, ToastStyle } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import { useEffect, useState } from "react";
import FeedItem from "./components/FeedItem";
import { Feed, Tool } from "./responseTypes";
import { getToolsFeed } from "./util";

interface State {
  feed: Feed<Tool> | null;
  error?: Error;
}

export default function ToolsList() {
  const [state, setState] = useState<State>({
    feed: null,
  });

  useEffect(() => {
    async function fetchTools() {
      const feedEither = await getToolsFeed();

      if (isLeft(feedEither)) {
        console.error(feedEither.left);
        showToast(ToastStyle.Failure, "Failed to fetch Tools.");
        return;
      }

      setState({ feed: feedEither.right });
    }

    fetchTools();
  }, []);

  return (
    <List
      isLoading={state.feed === null}
      navigationTitle={state.feed?.title}
      searchBarPlaceholder="Filter tools by name..."
    >
      {state.feed?.items.map((tool) => (
        <FeedItem item={tool} key={tool.link} />
      ))}
    </List>
  );
}
