import { Account, Post } from "../../types/types";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  FollowToastMessage,
  FollowersText,
  FollowingText,
  HideDetails,
  LoadMore,
  LoadMoreKey,
  LoadingMorePosts,
  MutedText,
  OpenProfileInBrowser,
  ShowDetails,
  TotalPosts,
  UnfollowToastMessage,
} from "../../utils/constants";
import { buildTitle, getAuthorDetailsMarkdown, showDangerToast, showSuccessToast } from "../../utils/common";
import { deleteFollow, follow, getLikePosts, getProfile } from "../../libs/atp";
import { useEffect, useState } from "react";

import { AppBskyFeedDefs } from "@atproto/api";
import CustomAction from "../actions/CustomAction";
import { ExtensionConfig } from "../../config/config";
import HomeAction from "../actions/HomeAction";
import NavigationDropdown from "../nav/NavigationDropdown";
import PostItem from "./PostItem";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { parseFeed } from "../../utils/parser";
import { useCachedState } from "@raycast/utils";

interface LikeFeedProps {
  authorHandle: string;
  showNavDropdown: boolean;
  previousViewTitle?: string;
}

export default function LikeFeed({ showNavDropdown, authorHandle, previousViewTitle = "" }: LikeFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useCachedState(ShowDetails, false);
  const [author, setAuthor] = useState<ProfileViewDetailed | null>(null);
  const [firstFetch, setFirstFetch] = useState(true);
  const [selectionIndex, setSelectionIndex] = useState("");

  const fetchPosts = async () => {
    setIsLoadingPosts(true);

    const fetchLimit = firstFetch ? ExtensionConfig.likeFeedFirstLimit : ExtensionConfig.likeFeedRequestLimit;

    const data = await getLikePosts(authorHandle, cursor, fetchLimit);

    if (!data) {
      setIsLoadingPosts(false);
      return;
    }

    const posts = await parseFeed(data.feed as AppBskyFeedDefs.FeedViewPost[]);

    if (data.cursor) {
      setCursor(data.cursor);
    } else {
      setCursor(null);
    }

    setPosts((state) => {
      const existingIds = new Set(state.map((post) => post.uri));
      const newPosts = posts.filter((post) => !existingIds.has(post.uri));
      return [...state, ...newPosts];
    });

    setFirstFetch(false);
    setIsLoadingPosts(false);
  };

  const fetchAuthor = async () => {
    const profile = await getProfile(authorHandle);
    setIsLoadingAuthor(false);
    if (profile) {
      setAuthor(profile);
    }
  };

  useEffect(() => {
    setIsLoadingPosts(true);
    setIsLoadingAuthor(true);
    if (authorHandle) {
      fetchAuthor();
      fetchPosts();
    }
  }, [authorHandle]);

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    setSelectionIndex(index);
    if (index == LoadMoreKey) {
      await fetchPosts();
    }
  };

  const getAuthorAccessory = (author: ProfileViewDetailed) => {
    const accessory = [
      {
        tag: { value: author.followersCount ? author.followersCount.toString() : "0", color: Color.Yellow },
        tooltip: FollowersText,
      },
      {
        tag: { value: author.followsCount ? author.followsCount.toString() : "0", color: Color.Blue },
        tooltip: FollowingText,
      },
    ];

    if (author.viewer && author.viewer.following) {
      accessory.push({
        tag: { value: FollowingText, color: Color.Green },
        tooltip: FollowingText,
      });

      if (author.viewer && author.viewer.muted) {
        accessory.push({
          tag: { value: MutedText, color: Color.Red },
          tooltip: MutedText,
        });
      }
    }

    return accessory;
  };

  const getAccount = (author: ProfileViewDetailed): Account => {
    return {
      did: author.did,
      handle: author.handle,
      blockedUri: author.viewer && author.viewer.blocking ? author.viewer.blocking : "",
      displayName: author.displayName ? author.displayName : "",
      avatarUrl: author.avatar ? author.avatar : "",
    };
  };

  const followAccount = async (account: Account) => {
    await follow(account.did);
    showSuccessToast(`${FollowToastMessage} ${account.handle}`);

    fetchAuthor();
  };

  const unfollowAccount = async (account: Account) => {
    const profile = await getProfile(account.handle);
    if (profile && profile.viewer && profile.viewer.following) {
      await deleteFollow(profile.viewer.following);
      showDangerToast(`${UnfollowToastMessage} ${account.handle}`);
    }

    fetchAuthor();
  };

  useEffect(() => {
    if (!firstFetch) {
      fetchPosts();
    }
  }, [firstFetch]);

  useEffect(() => {
    const filteredPosts = posts.filter((post) => {
      if (searchText.length > 0) {
        return `${post.createdByUser.handle} ${post.text.toLowerCase()}`.includes(searchText.toLowerCase());
      } else {
        return true;
      }
    });
    setFilteredPosts(filteredPosts);
  }, [searchText, posts]);

  return (
    <List
      isLoading={isLoadingPosts || isLoadingAuthor}
      isShowingDetail={isShowingDetails}
      onSearchTextChange={setSearchText}
      onSelectionChange={(index) => onSelectionChange(index)}
      navigationTitle={buildTitle(previousViewTitle, `@${authorHandle}'s likes`)}
      searchBarPlaceholder={`Search @${authorHandle}'s liked posts`}
      searchBarAccessory={showNavDropdown ? <NavigationDropdown currentViewId={6} /> : null}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
    >
      {posts.length > 0 && author && (
        <List.Section title={`Profile`}>
          <List.Item
            id={`profile`}
            title={author?.displayName ? author.displayName : authorHandle}
            subtitle={author?.description ? author.description : ""}
            icon={{ source: author?.avatar ? author.avatar : Icon.ChessPiece }}
            actions={
              <ActionPanel>
                <Action
                  icon={isShowingDetails ? Icon.AppWindow : Icon.AppWindowSidebarRight}
                  title={isShowingDetails ? HideDetails : ShowDetails}
                  onAction={() => setIsShowingDetails((state) => !state)}
                />
                <Action.OpenInBrowser
                  title={OpenProfileInBrowser}
                  icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  url={`${BlueskyProfileUrlBase}/${authorHandle}`}
                />
                {author.viewer && author.viewer.following ? (
                  <CustomAction actionKey="unfollow" onClick={() => unfollowAccount(getAccount(author))} />
                ) : (
                  <CustomAction actionKey="follow" onClick={() => followAccount(getAccount(author))} />
                )}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={getAuthorDetailsMarkdown(author)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title={FollowingText}
                      text={author.followersCount ? author.followersCount.toString() : "0"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={FollowersText}
                      text={author.followsCount ? author.followsCount.toString() : "0"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={TotalPosts}
                      text={author.postsCount ? author.postsCount.toString() : "0"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={isShowingDetails ? null : getAuthorAccessory(author)}
          />
        </List.Section>
      )}
      <List.Section title={`Posts liked by ${author?.displayName ? author.displayName : authorHandle}`}>
        {filteredPosts.map((post) => (
          <PostItem
            previousViewTitle={buildTitle(previousViewTitle, `@${authorHandle}`)}
            isSelected={selectionIndex === post.uri}
            key={post.uri}
            post={post}
            isShowingDetails={isShowingDetails}
            toggleShowDetails={() => setIsShowingDetails((state) => !state)}
          />
        ))}
        {cursor && searchText.length === 0 && (
          <List.Item
            id={LoadMoreKey}
            key={LoadMoreKey}
            title=""
            subtitle={isLoadingPosts ? LoadingMorePosts : LoadMore}
          />
        )}
      </List.Section>
    </List>
  );
}
