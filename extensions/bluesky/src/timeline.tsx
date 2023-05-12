import { ActionPanel, List, useNavigation } from "@raycast/api";
import {
  LoadMore,
  LoadMoreKey,
  LoadingMorePosts,
  ShowDetails,
  TimelineCacheKey,
  ViewTimelineNavigationTitle,
  ViewTimelineSearchBarPlaceholder,
} from "./utils/constants";
import { useEffect, useState } from "react";

import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import NavigationDropdown from "./components/nav/NavigationDropdown";
import Onboard from "./components/onboarding/Onboard";
import { Post } from "./types/types";
import PostItem from "./components/feed/PostItem";
import { buildTitle } from "./utils/common";
import { getTimelinePosts } from "./libs/atp";
import { parseFeed } from "./utils/parser";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";

interface TimelineProps {
  previousViewTitle?: string;
}

export default function Timeline({ previousViewTitle = "" }: TimelineProps) {
  const [posts, setPosts] = useCachedState<Post[]>(TimelineCacheKey, []);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const { push } = useNavigation();
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowDetails, false);
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [firstFetch, setFirstFetch] = useState(true);
  const [selectionIndex, setSelectionIndex] = useState("");

  const fetchPosts = async () => {
    setIsLoading(true);

    const data = await getTimelinePosts(cursor, ExtensionConfig.timelineFeedRequestLimit);

    if (!data) {
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
      fetchPosts();
    }
  }, [sessionStarted]);

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    setSelectionIndex(index);

    if (index === LoadMoreKey) {
      await fetchPosts();
    }
  };

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)} />
  ) : (
    <List
      isLoading={isLoading}
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
      {posts.map((post) => (
        <PostItem
          isSelected={selectionIndex === post.uri}
          previousViewTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)}
          key={post.uri}
          post={post}
          isShowingDetails={isShowingDetails}
          toggleShowDetails={() => setIsShowingDetails((state) => !state)}
        />
      ))}
      {cursor && (
        <List.Item id={LoadMoreKey} key={LoadMoreKey} title="" subtitle={isLoading ? LoadingMorePosts : LoadMore} />
      )}
    </List>
  );
}
