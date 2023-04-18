import { ActionPanel, List, useNavigation } from "@raycast/api";
import {
  ShowPostDetails,
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

interface ViewTimelineProps {
  previousViewTitle?: string;
}

export default function ViewTimeline({ previousViewTitle = "" }: ViewTimelineProps) {
  const [posts, setPosts] = useCachedState<Post[]>(TimelineCacheKey, []);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const { push } = useNavigation();
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowPostDetails, false);
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [firstFetch, setFirstFetch] = useState(true);

  const fetchPosts = async () => {
    setIsLoading(true);

    const data = await getTimelinePosts(cursor, ExtensionConfig.timelineFeedRequestLimit);

    if (!data) {
      return;
    }

    const posts = await parseFeed(data.feed);

    if (data.cursor) {
      setCursor(data.cursor);
    }

    setPosts((state) => {
      if (firstFetch) {
        state = [];
        setFirstFetch(false);
      }

      const existingIds = new Set(state.map((post) => post.uri));
      const newPosts = posts.filter((post) => !existingIds.has(post.uri));
      return [...state, ...newPosts];
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

    if (index == posts[posts.length - 1].uri) {
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
          previousViewTitle={buildTitle(previousViewTitle, ViewTimelineNavigationTitle)}
          key={post.uri}
          post={post}
          isShowingDetails={isShowingDetails}
          toggleShowDetails={() => setIsShowingDetails((state) => !state)}
        />
      ))}
    </List>
  );
}
