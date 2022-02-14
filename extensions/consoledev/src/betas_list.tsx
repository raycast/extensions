import { List, showToast, ToastStyle } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import { useEffect, useState } from "react";
import FeedItem from "./components/FeedItem";
import { Beta, Feed } from "./responseTypes";
import { getBetasFeed } from "./util";

interface State {
  feed: Feed<Beta> | null;
  error?: Error;
}

export default function BetasList() {
  const [state, setState] = useState<State>({
    feed: null,
  });

  useEffect(() => {
    async function fetchBetas() {
      const feedEither = await getBetasFeed();

      if (isLeft(feedEither)) {
        showToast(ToastStyle.Failure, "Failed to fetch Betas.");
        return;
      }

      setState({ feed: feedEither.right });
    }

    fetchBetas();
  }, []);

  return (
    <List
      isLoading={state.feed === null}
      navigationTitle={state.feed?.title}
      searchBarPlaceholder="Filter betas by name..."
    >
      {state.feed?.items.map((beta) => (
        <FeedItem item={beta} key={beta.link} />
      ))}
    </List>
  );
}
