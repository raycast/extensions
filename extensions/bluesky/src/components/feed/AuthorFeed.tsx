import { ActionPanel, List } from "@raycast/api";
import { ShowPostDetails, ViewRecentPostsNavigationTitle } from "../../utils/constants";
import { useEffect, useState } from "react";

import { ExtensionConfig } from "../../config/config";
import HomeAction from "../actions/HomeAction";
import NavigationDropdown from "../nav/NavigationDropdown";
import { Post } from "../../types/types";
import PostItem from "./PostItem";
import { buildTitle } from "../../utils/common";
import { getUserPosts } from "../../libs/atp";
import { parseFeed } from "../../utils/parser";
import { useCachedState } from "@raycast/utils";

interface AuthorFeedProps {
  authorHandle: string;
  previousViewTitle: string;
}

export default function AuthorFeed({ authorHandle, previousViewTitle = "" }: AuthorFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowPostDetails, false);

  const fetchPosts = async () => {
    setIsLoading(true);

    const data = await getUserPosts(authorHandle, cursor, ExtensionConfig.userFeedRequestLimit);

    if (!data) {
      return;
    }

    const posts = await parseFeed(data.feed);

    if (data.cursor) {
      setCursor(data.cursor);
    }

    setPosts((state) => {
      const existingIds = new Set(state.map((post) => post.uri));
      const newPosts = posts.filter((post) => !existingIds.has(post.uri));
      return [...state, ...newPosts];
    });

    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    if (authorHandle) {
      fetchPosts();
    }
  }, [authorHandle]);

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    if (index == posts[posts.length - 1].uri) {
      await fetchPosts();
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetails}
      onSelectionChange={(index) => onSelectionChange(index)}
      navigationTitle={buildTitle(previousViewTitle, `@${authorHandle}`)}
      searchBarPlaceholder={`Search ${authorHandle}'s timeline`}
      searchBarAccessory={<NavigationDropdown currentViewId={5} />}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
    >
      {posts.map((post) => (
        <PostItem
          previousViewTitle={buildTitle(previousViewTitle, `@${authorHandle}`)}
          key={post.uri}
          post={post}
          isShowingDetails={isShowingDetails}
          toggleShowDetails={() => setIsShowingDetails((state) => !state)}
        />
      ))}
    </List>
  );
}
