import { Account, Post } from "../../types/types";
import { Action, ActionPanel, Color, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import {
  BlockAccountConfirm,
  BlockToastMessage,
  BlueskyProfileUrlBase,
  ErrorToastMessage,
  FollowToastMessage,
  HideDetails,
  InReplyToTag,
  LikePostToastMessage,
  LikesTooltip,
  MuteToastMessage,
  OpenPostInBrowser,
  OpenProfileInBrowser,
  QuotedByTag,
  RepliesMarkdown,
  RepliesTooltip,
  RepostToastMessage,
  RepostedByTag,
  RepostsTooltip,
  ShowDetails,
  UnfollowToastMessage,
  UnlikePostToastMessage,
  UnmuteToastMessage,
} from "../../utils/constants";
import {
  block,
  deleteFollow,
  follow,
  getPostThread,
  getProfile,
  like,
  mute,
  repost,
  unlike,
  unmute,
} from "../../libs/atp";
import { getAccountIcon, getPostUrl, showDangerToast, showLoadingToast, showSuccessToast } from "../../utils/common";
import { useEffect, useState } from "react";

import AuthorFeed from "./AuthorFeed";
import CustomAction from "../actions/CustomAction";
import HomeAction from "../actions/HomeAction";
import LikeFeed from "./LikeFeed";
import NewPost from "../../new-post";
import { isThreadViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { getPostMarkdownView } from "../../utils/parser";
import { useDebounce } from "use-debounce";

interface PostItemProps {
  post: Post;
  previousViewTitle: string;
  isShowingDetails: boolean;
  isSelected: boolean;
  authorFeedHandle?: string;
  toggleShowDetails: () => void;
}

export default function PostItem({
  previousViewTitle,
  isSelected,
  post,
  isShowingDetails,
  authorFeedHandle,
  toggleShowDetails,
}: PostItemProps) {
  const [likeUri, setLikeUri] = useState(post.likeUri);
  const [likeCount, setLikeCount] = useState(post.metrics.likeCount);

  const [following, setFollowing] = useState(post.viewer ? post.viewer.following : null);
  const [muted, setMuted] = useState(post.viewer ? post.viewer.muted : null);
  const [blocked, setBlocked] = useState(false);
  const [postMarkdown, setPostMarkdown] = useState(post.markdownView);
  const [fullThreadLoaded, setFullThreadLoaded] = useState(false);
  const debouncedPostSelected = useDebounce<boolean>(isSelected, 1000);

  const { push } = useNavigation();

  const onQuotePostSelected = async (post: Post) => {
    push(
      <NewPost
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
      />,
    );
  };

  const onReplyToPostSelected = async (post: Post) => {
    push(
      <NewPost
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
      />,
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

  const getPostAccessory = (post: Post, isShowingDetails: boolean) => {
    const accessory = [];
    if (post.imageEmbeds && post.imageEmbeds.length > 0) {
      accessory.push({
        icon: {
          source: post.imageEmbeds[0],
        },
      });
    }

    if (!isShowingDetails && post.reason && post.reason.type === "repost") {
      accessory.push({
        tag: { value: `${RepostedByTag} ${post.reason.authorName}`, color: Color.Green },
      });
    }

    if (!isShowingDetails && post.reason && post.reason.type === "reply") {
      accessory.push({
        tag: { value: `${InReplyToTag} ${post.reason.authorName}`, color: Color.Blue },
      });
    }

    if (!isShowingDetails && post.reason && post.reason.type === "quote") {
      accessory.push({
        tag: { value: `${QuotedByTag} ${post.reason.authorName}`, color: Color.Orange },
      });
    }

    if (!isShowingDetails && post.metrics.replyCount > 0) {
      accessory.push({
        tag: { value: `${post.metrics.replyCount} ↓`, color: Color.SecondaryText },
        tooltip: RepliesTooltip,
      });
    }

    if (post.metrics.repostCount > 0 && !isShowingDetails) {
      accessory.push({
        tag: { value: `${post.metrics.repostCount} ♺`, color: Color.SecondaryText },
        tooltip: RepostsTooltip,
      });
    }

    if (likeUri && likeUri.length > 0) {
      accessory.push({
        tag: { value: `${likeCount} ❤️ `, color: Color.Red },
        tooltip: LikesTooltip,
      });
    } else {
      accessory.push({
        tag: { value: `${likeCount} ♡ `, color: Color.SecondaryText },
        tooltip: LikesTooltip,
      });
    }

    return accessory;
  };

  const muteAccount = async (account: Account) => {
    await mute(account.did);
    showDangerToast(`${MuteToastMessage} ${account.handle}`);

    setMuted(true);
  };

  const unmuteAccount = async (account: Account) => {
    await unmute(account.did);
    showSuccessToast(`${UnmuteToastMessage} ${account.handle}`);

    setMuted(false);
  };

  const followAccount = async (account: Account) => {
    await follow(account.did);
    showSuccessToast(`${FollowToastMessage} ${account.handle}`);

    setFollowing(account.did);
  };

  const unfollowAccount = async (account: Account) => {
    const profile = await getProfile(account.handle);
    if (profile && profile.viewer && profile.viewer.following) {
      await deleteFollow(profile.viewer.following);
      showDangerToast(`${UnfollowToastMessage} ${account.handle}`);
      setFollowing(null);
    }
  };

  const blockAccount = async (account: Account) => {
    if (await confirmAlert({ title: BlockAccountConfirm(account.handle) })) {
      await block(account);
      showDangerToast(`${BlockToastMessage} ${account.handle}`);
      setBlocked(true);
    }
  };

  const getThread = async (post: Post) => {
    const data = await getPostThread(post.uri);

    if (isThreadViewPost(data.thread) && isThreadViewPost(data.thread.replies)) {
      const { replies } = data.thread;
      let replyMarkdown = RepliesMarkdown;

      for (const reply of replies) {
        if (isThreadViewPost(reply)) {
          const replyText = await getPostMarkdownView(reply.post, []);
          replyMarkdown = replyMarkdown + replyText;
        }
      }

      setFullThreadLoaded(true);
      setPostMarkdown((state) => state + replyMarkdown);
    }
  };

  useEffect(() => {
    if (isShowingDetails && debouncedPostSelected[0] && !fullThreadLoaded && post.metrics.replyCount > 0) {
      getThread(post);
    }
  }, [debouncedPostSelected[0], fullThreadLoaded, isShowingDetails]);

  const getPostTitle = (post: Post) => {
    if (post.createdByUser.handle === authorFeedHandle || isShowingDetails) {
      return "";
    }

    return `${post.createdByUser.displayName ? post.createdByUser.displayName : post.createdByUser.handle}`;
  };

  return (
    <List.Item
      key={post.uri}
      id={post.uri}
      icon={{ source: getAccountIcon(post.createdByUser) }}
      accessories={getPostAccessory(post, isShowingDetails)}
      title={getPostTitle(post).replace(/\n/g, " ")}
      subtitle={{ value: post.text, tooltip: post.text }}
      actions={
        <ActionPanel>
          <Action
            icon={isShowingDetails ? Icon.AppWindow : Icon.AppWindowSidebarRight}
            title={isShowingDetails ? HideDetails : ShowDetails}
            onAction={toggleShowDetails}
          />
          <ActionPanel.Section>
            <CustomAction
              actionKey="openProfile"
              onClick={() =>
                push(
                  <AuthorFeed
                    showNavDropdown={false}
                    previousViewTitle={previousViewTitle}
                    authorHandle={post.createdByUser.handle}
                  />,
                )
              }
            />
            <CustomAction
              actionKey="openAccountLikes"
              onClick={() =>
                push(
                  <LikeFeed
                    showNavDropdown={false}
                    previousViewTitle={previousViewTitle}
                    authorHandle={post.createdByUser.handle}
                  />,
                )
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
            <Action.OpenInBrowser
              title={OpenPostInBrowser}
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              url={getPostUrl(post.createdByUser.handle, post.uri)}
            />
            <Action.OpenInBrowser
              title={OpenProfileInBrowser}
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              url={`${BlueskyProfileUrlBase}/${post.createdByUser.handle}`}
            />
          </ActionPanel.Section>
          {post.viewer && muted !== null && (
            <ActionPanel.Section>
              {following && following?.length > 0 ? (
                <CustomAction actionKey="unfollow" onClick={() => unfollowAccount(post.createdByUser)} />
              ) : (
                <CustomAction actionKey="follow" onClick={() => followAccount(post.createdByUser)} />
              )}
              {muted ? (
                <CustomAction actionKey="unmute" onClick={() => unmuteAccount(post.createdByUser)} />
              ) : (
                <CustomAction actionKey="mute" onClick={() => muteAccount(post.createdByUser)} />
              )}
              {!blocked && <CustomAction actionKey="block" onClick={() => blockAccount(post.createdByUser)} />}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Post Link"
              icon={{ source: Icon.CopyClipboard, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              content={getPostUrl(post.createdByUser.handle, post.uri)}
            />
            <Action.CopyToClipboard
              title="Copy Post Text"
              icon={{ source: Icon.CopyClipboard, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              content={post.text}
            />
          </ActionPanel.Section>
          <HomeAction />
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={postMarkdown} />}
    />
  );
}
