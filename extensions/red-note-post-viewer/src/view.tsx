import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Grid,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import client from "./client.js";
import DetailInfo from "./detail-info.js";
import { PostItem } from "./types.js";
import { BASE_URL, HOME_PAGE_SIZE, SEARCH_PAGE_SIZE } from "./constants.js";
import { parseUrl } from "./utils.js";

export default function Command() {
  const { push } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [mode, setMode] = useState<"homefeed" | "search">("homefeed");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // parse context
  const parseContext = async () => {
    const text = await Clipboard.readText();
    if (text) {
      const result = parseUrl(text);
      if (result) {
        previewDetail(result.noteId, result.xToken);
      }
    }
  };

  // home feed
  const refresh = async () => {
    setIsLoading(true);
    const newPosts = await client.getHomeFeed();
    setMode("homefeed");
    setHasMore(true);
    setPosts(newPosts);
    setIsLoading(false);
  };

  const loadMoreHomefeed = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    const newPosts = await client.getHomeFeed();
    setMode("homefeed");
    setHasMore(true);
    setPosts([...posts, ...newPosts]);
    setIsLoading(false);
  };

  useEffect(() => {
    client.ready().then(() => {
      parseContext();
      refresh();
    });
  }, []);

  const [searchText, setSearchText] = useState("");

  // search post
  const handleSearch = async (keyword: string) => {
    setIsLoading(true);
    setPage(1);
    const { items, hasMore } = await client.searchPost(keyword, page);
    setMode("search");
    setPosts(items);
    setHasMore(hasMore);
    setIsLoading(false);
  };

  const loadMoreSearch = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setPage(page + 1);
    const { items, hasMore } = await client.searchPost(searchText, page);
    setMode("search");
    setPosts([...posts, ...items]);
    setHasMore(hasMore);
    setIsLoading(false);
  };

  // preview post detail
  const previewDetail = async (noteId: string, xToken: string) => {
    if (!noteId || !xToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid link",
      });
      return;
    }

    const details = await client.getNoteInfo(noteId, xToken);
    if (details) {
      push(<DetailInfo details={details} />);
    }
  };

  useEffect(() => {
    if (!searchText) {
      if (mode === "search") {
        refresh();
      }
      return;
    }

    if (!searchText.includes(BASE_URL)) {
      handleSearch(searchText);
      return;
    }

    // parse valid post link
    const result = parseUrl(searchText);
    if (result) {
      previewDetail(result.noteId, result.xToken);
      setSearchText("");
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Invalid link",
      message: "Please paste a valid RedNote post link",
    });
  }, [searchText]);

  return (
    <Grid
      columns={4}
      aspectRatio="3/4"
      navigationTitle="@半糖人类"
      fit={Grid.Fit.Fill}
      filtering={false}
      throttle={true}
      isLoading={isLoading}
      pagination={{
        onLoadMore: mode === "homefeed" ? loadMoreHomefeed : loadMoreSearch,
        hasMore,
        pageSize: mode === "homefeed" ? HOME_PAGE_SIZE : SEARCH_PAGE_SIZE,
      }}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search topic, keyword or paste link"
      actions={
        <ActionPanel>
          <Action title="Change Cookie" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Grid.EmptyView title="Type to search or Paste to parse" icon={{ source: "red-note-icon.png" }} />
      {posts.map((post, index) => (
        <Grid.Item
          key={`${post.noteId}-${index}`}
          title={post.title}
          subtitle={post.user.nickname}
          content={{
            source: post.cover,
          }}
          actions={
            <ActionPanel>
              <Action title="Preview Detail" onAction={() => previewDetail(post.noteId, post.xsecToken)} />
              <Action title="Refresh" onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
