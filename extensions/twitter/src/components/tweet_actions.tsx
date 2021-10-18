import { Color, Icon, OpenInBrowserAction, PushAction } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
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

export function OpenAuthorProfileAction(props: { tweet: TweetV1 }) {
  return (
    <OpenInBrowserAction
      title="Open Author Profile"
      url={`https://twitter.com/${props.tweet.user.screen_name}`}
      icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
    />
  );
}
