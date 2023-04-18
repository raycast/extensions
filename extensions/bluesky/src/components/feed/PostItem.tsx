import { Action, ActionPanel, Icon, List, open, useNavigation } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  ErrorToastMessage,
  FollowToastMessage,
  HidePostDetails,
  LikePostToastMessage,
  MuteToastMessage,
  RepostToastMessage,
  ShowPostDetails,
  UnfollowToastMessage,
  UnlikePostToastMessage,
  UnmuteToastMessage,
} from "../../utils/constants";
import { Post, User } from "../../types/types";
import { deleteFollow, follow, getProfile, like, mute, repost, unlike, unmute } from "../../libs/atp";
import { showDangerToast, showLoadingToast, showSuccessToast } from "../../utils/common";

import AuthorFeed from "./AuthorFeed";
import CreateNewPost from "../../create-a-new-post";
import CustomAction from "../actions/CustomAction";
import HomeAction from "../actions/HomeAction";
import { getPostUrl } from "../../utils/parser";
import { useState } from "react";

interface PostItemProps {
  post: Post;
  previousViewTitle: string;
  isShowingDetails: boolean;
  toggleShowDetails: () => void;
}

export default function PostItem({ previousViewTitle, post, isShowingDetails, toggleShowDetails }: PostItemProps) {
  const [likeUri, setLikeUri] = useState(post.likeUri);
  const [likeCount, setLikeCount] = useState(post.metrics.likeCount);

  const [following, setFollowing] = useState(post.viewer ? post.viewer.following : null);
  const [muted, setMuted] = useState(post.viewer ? post.viewer.muted : null);

  const { push } = useNavigation();

  const onQuotePostSelected = async (post: Post) => {
    push(
      <CreateNewPost
        previousViewTitle={previousViewTitle}
        postReference={{
          reason: "quote",
          quotedFromAuthor:
            post.createdByUser.displayName && post.createdByUser.displayName.length > 0
              ? post.createdByUser.displayName
              : post.createdByUser.handle,
          originalPostText: post.text,
          quotedRef: { record: { uri: post.uri, cid: post.cid } },
        }}
      />
    );
  };

  const onReplyToPostSelected = async (post: Post) => {
    push(
      <CreateNewPost
        previousViewTitle={previousViewTitle}
        postReference={{
          reason: "reply",
          replyToAuthor:
            post.createdByUser.displayName && post.createdByUser.displayName.length > 0
              ? post.createdByUser.displayName
              : post.createdByUser.handle,
          replyToText: post.text,
          replyRef: { root: { uri: post.uri, cid: post.cid }, parent: { uri: post.uri, cid: post.cid } },
        }}
      />
    );
  };

  const onRepostSelected = async (post: Post) => {
    await repost(post.uri, post.cid);
    showSuccessToast(RepostToastMessage);
  };

  const likePost = async (post: Post) => {
    showLoadingToast("...");
    setLikeCount((state) => state + 1);

    const response = await like(post.uri, post.cid);
    if (response.uri) {
      setLikeUri(response.uri);
      showSuccessToast(LikePostToastMessage);

      return;
    }

    showDangerToast(ErrorToastMessage);
  };

  const unlikePost = async () => {
    showLoadingToast("...");
    setLikeUri("");
    setLikeCount((state) => state - 1);

    await unlike(likeUri);
    showDangerToast(UnlikePostToastMessage);
  };

  const getPostAccessoryText = () => {
    if (likeUri && likeUri.length > 0) {
      return `${likeCount} ❤️ `;
    }

    return `${likeCount} ♡ `;
  };

  const muteUser = async (user: User) => {
    await mute(user.did);
    showDangerToast(`${MuteToastMessage} ${user.handle}`);

    setMuted(true);
  };

  const unmuteUser = async (user: User) => {
    await unmute(user.did);
    showSuccessToast(`${UnmuteToastMessage} ${user.handle}`);

    setMuted(false);
  };

  const followUser = async (user: User) => {
    await follow(user.did);
    showSuccessToast(`${FollowToastMessage} ${user.handle}`);

    setFollowing(user.did);
  };

  const unfollowUser = async (user: User) => {
    const profile = await getProfile(user.handle);
    if (profile && profile.viewer && profile.viewer.following) {
      await deleteFollow(profile.viewer.following);
      showDangerToast(`${UnfollowToastMessage} ${user.handle}`);
      setFollowing(null);
    }
  };

  return (
    <List.Item
      key={post.uri}
      id={post.uri}
      icon={{ source: post.createdByUser.avatarUrl }}
      accessories={[{ text: getPostAccessoryText() }]}
      title={
        `${post.createdByUser.displayName ? post.createdByUser.displayName : post.createdByUser.handle}: ` + post.text
      }
      actions={
        <ActionPanel>
          <Action
            icon={isShowingDetails ? Icon.AppWindow : Icon.AppWindowSidebarRight}
            title={isShowingDetails ? HidePostDetails : ShowPostDetails}
            onAction={toggleShowDetails}
          />
          <ActionPanel.Section>
            <CustomAction
              actionKey="openProfile"
              onClick={() =>
                push(<AuthorFeed previousViewTitle={previousViewTitle} authorHandle={post.createdByUser.handle} />)
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {likeUri && likeUri.length > 0 ? (
              <CustomAction actionKey="unlike" onClick={() => unlikePost()} />
            ) : (
              <CustomAction actionKey="like" onClick={() => likePost(post)} />
            )}
            <CustomAction actionKey="reply" onClick={() => onReplyToPostSelected(post)} />
            <CustomAction actionKey="repost" onClick={() => onRepostSelected(post)} />
            <CustomAction actionKey="quote" onClick={() => onQuotePostSelected(post)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CustomAction
              actionKey="openPostInBrowser"
              onClick={() => open(getPostUrl(post.createdByUser.handle, post.uri))}
            />
            <CustomAction
              actionKey="openProfileInBrowser"
              onClick={() => open(`${BlueskyProfileUrlBase}/${post.createdByUser.handle}`)}
            />
          </ActionPanel.Section>
          {post.viewer && muted !== null && (
            <ActionPanel.Section>
              {following && following?.length > 0 ? (
                <CustomAction actionKey="unfollow" onClick={() => unfollowUser(post.createdByUser)} />
              ) : (
                <CustomAction actionKey="follow" onClick={() => followUser(post.createdByUser)} />
              )}
              {muted ? (
                <CustomAction actionKey="unmute" onClick={() => unmuteUser(post.createdByUser)} />
              ) : (
                <CustomAction actionKey="mute" onClick={() => muteUser(post.createdByUser)} />
              )}
            </ActionPanel.Section>
          )}
          <HomeAction />
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={post.markdownView} />}
    />
  );
}
