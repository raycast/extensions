import { Action, Alert, Color, confirmAlert, Icon, Keyboard, popToRoot, showToast, Toast } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import { Tweet, User } from "../lib/twitter";
import { resetOAuthTokens } from "../lib/oauth";
import { TweetDetail } from "./detail";
import { TweetSendForm, TweetSendThreadFormV2 } from "./send";
import { clientV2, Fetcher } from "../lib/twitterapi_v2";
import { getErrorMessage, sleep } from "../../utils";
import { AuthorTweetList } from "./author";
import { PostEngagementList } from "./engagement";

export function LogoutAction(): ReactElement {
  const handle = async () => {
    await resetOAuthTokens();
    clientV2.clearCache();
    await popToRoot();
  };
  return <Action title="Logout" icon={Icon.Logout} onAction={handle} />;
}

export function ShowDetailV2Action(props: {
  tweet: Tweet;
  fetcher?: Fetcher;
  canModerateReply?: boolean;
}): ReactElement {
  return (
    <Action.Push
      title="Show Post"
      icon={Icon.AppWindowSidebarRight}
      target={<TweetDetail tweet={props.tweet} fetcher={props.fetcher} canModerateReply={props.canModerateReply} />}
    />
  );
}

export function OpenTweetInBrowerAction(props: { tweet: Tweet }): ReactElement {
  const t = props.tweet;
  return <Action.OpenInBrowser url={`https://twitter.com/${t.user.username}/status/${t.id}`} />;
}

export function ReplyTweetAction(props: { tweet: Tweet }): ReactElement {
  return <Action.Push title="Reply" target={<TweetSendForm replyTweet={props.tweet} />} icon={Icon.Reply} />;
}

export function QuoteTweetAction(props: { tweet: Tweet }): ReactElement {
  return (
    <Action.Push
      title="Quote Post"
      target={<TweetSendThreadFormV2 quotePostId={props.tweet.id} />}
      icon={Icon.QuotationMarks}
    />
  );
}

export function BookmarkTweetAction(props: { tweet: Tweet; remove?: boolean; fetcher?: Fetcher }): ReactElement {
  const handle = async () => {
    try {
      if (props.remove) await clientV2.removeBookmark(props.tweet.id);
      else await clientV2.bookmarkPost(props.tweet.id);
      await showToast({ style: Toast.Style.Success, title: props.remove ? "Bookmark removed" : "Post bookmarked" });
      await props.fetcher?.refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: props.remove ? "Could not remove bookmark" : "Could not bookmark post",
        message: getErrorMessage(error),
      });
    }
  };
  return <Action title={props.remove ? "Remove Bookmark" : "Add Bookmark"} icon={Icon.Bookmark} onAction={handle} />;
}

export function SetReplyHiddenAction(props: { tweet: Tweet; hidden: boolean }): ReactElement {
  const handle = async () => {
    try {
      await clientV2.setReplyHidden(props.tweet.id, props.hidden);
      await showToast({ style: Toast.Style.Success, title: props.hidden ? "Reply hidden" : "Reply unhidden" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: props.hidden ? "Could not hide reply" : "Could not unhide reply",
        message: getErrorMessage(error),
      });
    }
  };
  return (
    <Action
      title={props.hidden ? "Hide Reply" : "Unhide Reply"}
      icon={props.hidden ? Icon.EyeDisabled : Icon.Eye}
      onAction={handle}
    />
  );
}

export function ShowPostEngagementAction(props: { tweet: Tweet; kind: "likes" | "reposts" | "quotes" }): ReactElement {
  const titles = { likes: "Who Liked", reposts: "Who Reposted", quotes: "Quote Posts" };
  const icons = { likes: Icon.Heart, reposts: Icon.Repeat, quotes: Icon.QuotationMarks };
  return (
    <Action.Push
      title={titles[props.kind]}
      icon={icons[props.kind]}
      target={<PostEngagementList postId={props.tweet.id} kind={props.kind} />}
    />
  );
}

export function LikeTweetAction(props: { tweet: Tweet; fetcher?: Fetcher | undefined }): ReactElement {
  const handle = async () => {
    try {
      await clientV2.likeTweet(props.tweet);
      await showToast({ style: Toast.Style.Success, title: "Post liked" });
      if (props.fetcher) {
        await sleep(1000);
        await props.fetcher.updateInline();
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not like post", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Like"
      icon={{ source: Icon.Heart, tintColor: Color.Red }}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
      onAction={handle}
    />
  );
}

export function UnlikeTweetAction(props: { tweet: Tweet; fetcher?: Fetcher | undefined }): ReactElement {
  const handle = async () => {
    try {
      await clientV2.unlikeTweet(props.tweet);
      await showToast({ style: Toast.Style.Success, title: "Post unliked" });
      if (props.fetcher) {
        await sleep(1000);
        await props.fetcher.updateInline();
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not unlike post", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Unlike"
      icon={Icon.HeartDisabled}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "l" },
        Windows: { modifiers: ["ctrl", "shift"], key: "l" },
      }}
      onAction={handle}
    />
  );
}

export function RetweetAction(props: { tweet: Tweet }): ReactElement {
  const handle = async () => {
    try {
      await clientV2.retweet(props.tweet);
      await showToast({ style: Toast.Style.Success, title: "Post reposted" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not repost", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Repost"
      icon={Icon.Repeat}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "t" },
        Windows: { modifiers: ["ctrl"], key: "t" },
      }}
      onAction={handle}
    />
  );
}

export function DeleteTweetAction(props: { tweet: Tweet }) {
  const [user, setUser] = useState<string | undefined>();
  useEffect(() => {
    async function fetch() {
      try {
        const u = await clientV2.me();
        setUser(u.username);
      } catch {
        // ignore
      }
    }
    fetch();
  }, []);
  const t = props.tweet;
  const deleteTweet = async () => {
    try {
      const account = await clientV2.me();
      if (account.username !== t.user.username) {
        throw Error("You can only delete your own posts");
      }
      if (
        await confirmAlert({
          title: "Delete the post?",
          icon: Icon.Trash,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        await clientV2.deleteTweet(t);
        showToast({ style: Toast.Style.Success, title: "Post deleted", message: "Post deletion successful" });
        popToRoot();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not delete post", message: getErrorMessage(error) });
    }
  };
  if (user === t.user.username) {
    return (
      <Action
        title="Delete Post"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={deleteTweet}
      />
    );
  } else {
    return null;
  }
}

export function ShowAuthorTweetsAction(props: { tweet: Tweet }): ReactElement {
  return (
    <Action.Push
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Posts From @${props.tweet.user.username}`}
      target={<AuthorTweetList authorID={props.tweet.user.id} />}
      icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "a" },
        Windows: { modifiers: ["ctrl", "shift"], key: "a" },
      }}
    />
  );
}

export function OpenUserProfileInBrowserAction(props: { user: User }): ReactElement {
  return <Action.OpenInBrowser title="Open Author Profile" url={`https://twitter.com/${props.user.username}`} />;
}

export function RefreshExistingTweetsAction(props: { fetcher?: Fetcher | undefined }): ReactElement | null {
  const f = props.fetcher;
  if (!f) {
    return null;
  }
  const handle = async () => {
    await f.updateInline();
  };
  return (
    <Action
      title="Refresh Existing Posts"
      icon={Icon.ArrowClockwise}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "r" },
        Windows: { modifiers: ["ctrl", "shift"], key: "r" },
      }}
      onAction={handle}
    />
  );
}

export function RefreshTweetsAction(props: { fetcher?: Fetcher | undefined }): ReactElement | null {
  const f = props.fetcher;
  if (!f) {
    return null;
  }
  const handle = async () => {
    await f.refresh();
  };
  return (
    <Action
      title="Refresh Posts"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={handle}
    />
  );
}
