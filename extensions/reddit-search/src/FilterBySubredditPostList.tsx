import { List } from "@raycast/api";
import { useState } from "react";
import PostList from "./PostList";

export default function FilterBySubredditPostList({
  subreddit,
  subredditName,
}: {
  subreddit: string;
  subredditName: string;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState<string>("");

  return (
    <List
      isLoading={searching}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder={`Search r/${subredditName}...`}
    >
      <PostList setSearching={setSearching} subreddit={subreddit} query={query} />
    </List>
  );
}
