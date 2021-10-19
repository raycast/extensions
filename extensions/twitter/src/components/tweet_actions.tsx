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
import { TweetV1 } from "twitter-api-v2";
import { loggedInUserAccount, twitterClient } from "../twitterapi";
import { TweetSendForm } from "./send";
import { TweetDetail } from "./tweet";

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
    />
  );
}

export function DeleteTweetAction(props: { tweet: TweetV1 }) {
  const t = props.tweet;
  const deleteTweet = async () => {
    try {
      const account = await loggedInUserAccount();
      if (account.screen_name !== t.user.screen_name) {
        throw Error("You can only delete your own Tweets");
      }
      await twitterClient.v1.deleteTweet(t.id_str);
      showToast(ToastStyle.Success, "Tweet deleted", "Tweet deletion successful");
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Could not delete Tweet", error.message);
    }
  };
  return (
    <ActionPanel.Item
      title="Delete Tweet"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={deleteTweet}
    />
  );
}

export function RetweetAction(props: { tweet: TweetV1 }) {
  const t = props.tweet;
  const cmd = t.retweeted ? "unretweet" : "retweet";
  const title = t.retweeted ? "Unretweet" : "Retweet";
  const icon: ImageLike = t.retweeted
    ? { source: Icon.XmarkCircle, tintColor: Color.Red }
    : { source: "🔁", tintColor: Color.PrimaryText };
  const retweet = async () => {
    try {
      await twitterClient.v1.post(`statuses/${cmd}/${t.id_str}.json`);
      showToast(ToastStyle.Success, "Retweet successful", "Retweet creation successful");
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Could not retweet", error.message);
    }
  };
  return <ActionPanel.Item title={title} icon={icon} onAction={retweet} />;
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
