import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  clearSearchBar,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import client from "./client.js";
import DetailInfo from "./detail-info.js";
import GridItem from "./grid-item.js";
import { PostItem } from "./types.js";
import { BASE_URL, HOME_PAGE_SIZE, SEARCH_PAGE_SIZE } from "./constants.js";
import { parseUrl } from "./utils.js";

const { columnsOfGrid } = getPreferenceValues<ExtensionPreferences>();

export default function Command() {
  const { push } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
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
        showToast({
          title: "Loaded from Clipboard",
        });
      }
    }
  };

  // home feed
  const refresh = async (options?: { clearSearchBar?: boolean }) => {
    if (options?.clearSearchBar) clearSearchBar();
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
    client
      .ready()
      .then(() => {
        parseContext();
        refresh();
      })
      .catch(showFailureToast);
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

    const currentPage = page + 1;
    setIsLoading(true);
    setPage(currentPage);
    const { items, hasMore } = await client.searchPost(searchText, currentPage);
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
      columns={Number(columnsOfGrid)}
      aspectRatio="3/4"
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
        !isLoading && (
          <ActionPanel>
            <Action icon={Icon.Gear} title="Change Cookie" onAction={openExtensionPreferences} />
          </ActionPanel>
        )
      }
    >
      <Grid.EmptyView title="Type to search or Paste to parse" />
      {posts.map((post, index) => (
        <GridItem
          key={`post-${index}`}
          post={post}
          onPreview={() => previewDetail(post.noteId, post.xsecToken)}
          onRefresh={() => refresh({ clearSearchBar: true })}
        />
      ))}
    </Grid>
  );
}
