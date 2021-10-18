import { PushAction } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { TweetSendForm } from "./send";

export function ReplyTweetAction(props: { tweet: TweetV1 }) {
  return <PushAction title="Reply" target={<TweetSendForm replyTweet={props.tweet} />} />;
}
