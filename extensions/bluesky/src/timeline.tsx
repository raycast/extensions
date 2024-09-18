import { ActionPanel, List, useNavigation } from "@raycast/api";
import {
  LoadMore,
  LoadMoreKey,
  LoadingMorePosts,
  ShowingSearchResults as SearchResults,
  ShowDetails,
  TimelineCacheKey,
  ViewTimelineNavigationTitle,
  ViewTimelineSearchBarPlaceholder,
} from "./utils/constants";
import { getSearchPosts, getTimelinePosts } from "./libs/atp";
import { useEffect, useState } from "react";

import { AppBskyFeedDefs } from "@atproto/api";
import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import NavigationDropdown from "./components/nav/NavigationDropdown";
import Onboard from "./components/onboarding/Onboard";
import { Post } from "./types/types";
import PostItem from "./components/feed/PostItem";
import { buildTitle } from "./utils/common";
import { parseFeed } from "./utils/parser";
import { useCachedState } from "@raycast/utils";
import { useDebounce } from "use-debounce";
import useStartATSession from "./hooks/useStartATSession";

interface TimelineProps {
  previousViewTitle?: string;
}

export default function Timeline({ previousViewTitle = "" }: TimelineProps) {
  const [posts, setPosts] = useCachedState<Post[]>(TimelineCacheKey, []);
  const [searchPosts, setSearchPosts] = useState<Post[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const { push } = useNavigation();
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowDetails, false);
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [firstFetch, setFirstFetch] = useState(true);
  const [selectionIndex, setSelectionIndex] = useState("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedTerm = useDebounce<string>(searchTerm, 500);

  const fetchSearchPosts = async (searchTerm: string) => {
    setIsLoading(true);
    const data = await getSearchPosts(searchTerm);

    if (!data) {
      setIsLoading(false);
      return;
    }

    const posts = await parseFeed(data.feed as AppBskyFeedDefs.FeedViewPost[]);
    setSearchPosts(posts);
    setIsLoading(false);
  };

  const fetchTimelinePosts = async () => {
    setIsLoading(true);

    const data = await getTimelinePosts(cursor, ExtensionConfig.timelineFeedRequestLimit);

    if (!data) {
      setIsLoading(false);
      return;
    }

    const posts = await parseFeed(data.feed);

    if (data.cursor) {
      setCursor(data.cursor);
    } else {
      setCursor(null);
    }

    setPosts((state) => {
      if (firstFetch) {
        state = [];
        setFirstFetch(false);
      }

      const existingIds = new Set(state.map((post) => post.uri));
      const newPosts = posts.filter((post) => !existingIds.has(post.uri));

      const allPosts = [...state, ...newPosts].filter((post) => !post.reason || post.metrics.likeCount > 1);
      return allPosts;
    });

    setIsLoading(false);
  };

  useEffect(() => {
    if (sessionStarted) {
      fetchTimelinePosts();
    }
  }, [sessionStarted]);

  useEffect(() => {
    if (debouncedTerm[0] && debouncedTerm[0].length > 0) {
      fetchSearchPosts(debouncedTerm[0]);
      return;
    }

    setSearchPosts([]);
  }, [debouncedTerm[0]]);

  const onSearchTextChange = async (text: string) => {
    setIsLoading(true);
    setSearchTerm(text);
  };

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    setSelectionIndex(index);

    if (index === LoadMoreKey) {
      await fetchTimelinePosts();
    }
  };

  const getPostItem = (post: Post) => {
    return (
      <PostItem
        isSelected={selectionIndex === post.uri}
        previousViewTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)}
        key={post.uri}
        post={post}
        isShowingDetails={isShowingDetails}
        toggleShowDetails={() => setIsShowingDetails((state) => !state)}
      />
    );
  };

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)} />
  ) : (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      isShowingDetail={isShowingDetails}
      onSelectionChange={(index) => onSelectionChange(index)}
      navigationTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
      searchBarPlaceholder={ViewTimelineSearchBarPlaceholder}
      searchBarAccessory={<NavigationDropdown currentViewId={1} />}
    >
      <List.Section title={`${SearchResults}`}>{searchPosts.map((post) => getPostItem(post))}</List.Section>
      {searchPosts.length == 0 && (
        <>
          {posts.map((post) => getPostItem(post))}
          {cursor && (
            <List.Item id={LoadMoreKey} key={LoadMoreKey} title="" subtitle={isLoading ? LoadingMorePosts : LoadMore} />
          )}
        </>
      )}
    </List>
  );
}
