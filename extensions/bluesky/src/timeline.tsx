import { ActionPanel, List, useNavigation } from "@raycast/api";
import {
  ShowingSearchResults as SearchResults,
  ShowDetails,
  ViewTimelineNavigationTitle,
  ViewTimelineSearchBarPlaceholder,
} from "./utils/constants";
import { getSearchPosts, getTimelinePosts } from "./libs/atp";
import { useState } from "react";

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
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";

interface TimelineProps {
  previousViewTitle?: string;
}

export default function Timeline({ previousViewTitle = "" }: TimelineProps) {
  const { push } = useNavigation();
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowDetails, false);
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  const [selectionIndex, setSelectionIndex] = useState("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const {
    isLoading: isLoadingTimeline,
    data: posts,
    pagination,
  } = useCachedPromise(
    () => async (options: { cursor?: string }) => {
      const data = await getTimelinePosts(options.cursor ?? null, ExtensionConfig.timelineFeedRequestLimit);
      const posts = data ? await parseFeed(data.feed) : [];
      const filtered = posts.filter((post) => !post.reason || post.metrics.likeCount > 1);

      return {
        data: filtered,
        hasMore: !!data?.cursor,
        cursor: data?.cursor,
      };
    },
    [],
    {
      initialData: [],
      execute: sessionStarted,
    },
  );
  const onSearchTextChange = async (text: string) => {
    setSearchTerm(text);
  };

  const { isLoading: isSearching, data: searchPosts = [] } = usePromise(
    async (search) => {
      if (!search) return [];
      const data = await getSearchPosts(search);
      const posts = data ? await parseFeed(data.feed as AppBskyFeedDefs.FeedViewPost[]) : [];
      return posts;
    },
    [searchTerm],
    {
      execute: sessionStarted,
    },
  );

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

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    setSelectionIndex(index);
  };

  const isLoading = isLoadingTimeline || isSearching;

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)} />
  ) : (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      isShowingDetail={isShowingDetails}
      onSelectionChange={(index) => onSelectionChange(index)}
      pagination={!searchTerm ? pagination : undefined}
      navigationTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
      searchBarPlaceholder={ViewTimelineSearchBarPlaceholder}
      searchBarAccessory={<NavigationDropdown currentViewId={1} />}
      throttle
    >
      <List.Section title={`${SearchResults}`}>{searchPosts.map((post) => getPostItem(post))}</List.Section>
      {searchPosts.length == 0 && posts.map((post) => getPostItem(post))}
    </List>
  );
}
