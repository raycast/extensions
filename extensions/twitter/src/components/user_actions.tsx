import { Action } from "@raycast/api";
import { UserV1 } from "twitter-api-v2";
import UserTweetList from "./usertweets";

export function ShowUserTweetsAction(props: { user: UserV1 }) {
  return (
    <Action.Push
      title="Show Tweets"
      target={<UserTweetList username={props.user.screen_name} />}
      icon={{ source: "twitter.png" }}
    />
  );
}
