import {
  ActionPanel,
  Color,
  Icon,
  ImageLike,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TweetV1 } from "twitter-api-v2";
import { loggedInUserAccount, twitterClient, Fetcher } from "../twitterapi";
import { getErrorMessage } from "../utils";
import { TweetSendForm } from "./send";
import { TweetDetail } from "./tweet";
import UserTweetList from "./usertweets";

export function ShowTweetAction(props: { tweet: TweetV1 }) {
  return (
    <PushAction
      title="Show Tweet"
      target={<TweetDetail tweet={props.tweet} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
    />
  );
}

export function ReplyTweetAction(props: { tweet: TweetV1 }) {
  return (
    <PushAction
      title="Reply"
      target={<TweetSendForm replyTweet={props.tweet} />}
      icon={{ source: Icon.Bubble, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "w" }}
    />
  );
}

export function DeleteTweetAction(props: { tweet: TweetV1 }) {
  const [user, setUser] = useState<string | undefined>();
  useEffect(() => {
    async function fetch() {
      try {
        const u = await loggedInUserAccount();
        setUser(u.screen_name);
      } catch (error) {
        // ignore
      }
    }
    fetch();
  }, []);
  const t = props.tweet;
  const deleteTweet = async () => {
    try {
      const account = await loggedInUserAccount();
      if (account.screen_name !== t.user.screen_name) {
        throw Error("You can only delete your own Tweets");
      }
      await twitterClient.v1.deleteTweet(t.id_str);
      showToast(ToastStyle.Success, "Tweet deleted", "Tweet deletion successful");
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not delete Tweet", getErrorMessage(error));
    }
  };
  if (user === t.user.screen_name) {
    return (
      <ActionPanel.Item
        title="Delete Tweet"
        icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        onAction={deleteTweet}
      />
    );
  } else {
    return null;
  }
}

export function RetweetAction(props: { tweet: TweetV1; fetcher?: Fetcher }) {
  const t = props.tweet;
  const cmd = t.retweeted ? "unretweet" : "retweet";
  const title = t.retweeted ? "Unretweet" : "Retweet";
  const icon: ImageLike = t.retweeted
    ? { source: "retweet.png", tintColor: Color.Green }
    : { source: "retweet.png", tintColor: Color.PrimaryText };
  const retweet = async () => {
    try {
      await twitterClient.v1.post(`statuses/${cmd}/${t.id_str}.json`);
      showToast(ToastStyle.Success, "Retweet successful", "Retweet creation successful");
      if (props.fetcher) {
        await props.fetcher.updateInline();
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not retweet", getErrorMessage(error));
    }
  };
  return <ActionPanel.Item title={title} icon={icon} onAction={retweet} shortcut={{ modifiers: ["cmd"], key: "t" }} />;
}

export function LikeAction(props: { tweet: TweetV1; fetcher?: Fetcher }) {
  const t = props.tweet;
  const cmd = t.favorited ? "destroy" : "create";
  const title = t.favorited ? "Undo Like" : "Like";
  const icon: ImageLike = t.favorited
    ? { source: "heart_full.png", tintColor: Color.Red }
    : { source: "heart_empty.png", tintColor: Color.PrimaryText };
  const retweet = async () => {
    try {
      await twitterClient.v1.post(`favorites/${cmd}.json`, { id: t.id_str });
      showToast(ToastStyle.Success, `${title} successful`, `${title} operation successful`);
      if (props.fetcher) {
        await props.fetcher.updateInline();
      }
    } catch (error) {
      showToast(ToastStyle.Failure, `${title} failed`, getErrorMessage(error));
    }
  };
  return <ActionPanel.Item title={title} shortcut={{ modifiers: ["cmd"], key: "l" }} icon={icon} onAction={retweet} />;
}

export function OpenAuthorProfileAction(props: { tweet: TweetV1 }) {
  return (
    <OpenInBrowserAction
      title="Open Author Profile"
      url={`https://twitter.com/${props.tweet.user.screen_name}`}
      icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
    />
  );
}

export function RefreshInlineAction(props: { fetcher?: Fetcher }) {
  const handle = async () => {
    if (props.fetcher) {
      await props.fetcher.updateInline();
    }
  };
  return (
    <ActionPanel.Item
      title="Refresh Existing Tweets"
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
      onAction={handle}
    />
  );
}

export function RefreshAction(props: { title?: string; fetcher?: Fetcher }) {
  const handle = async () => {
    if (props.fetcher) {
      await props.fetcher.refresh();
    }
  };
  const title = props.title ? props.title : "Refresh Tweets";
  return (
    <ActionPanel.Item
      title={title}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }}
      onAction={handle}
    />
  );
}

export function ShowUserTweetsAction(props: { username: string; title?: string }) {
  return (
    <PushAction
      title={props.title || `Tweets from @${props.username}`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      icon={{ source: "twitter.png", tintColor: Color.PrimaryText }}
      target={<UserTweetList username={props.username} />}
    />
  );
}
