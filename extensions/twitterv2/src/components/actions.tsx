import { Action, Color, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import { Tweet } from "../lib/twitter";
import { resetOAuthTokens } from "../lib/oauth";
import { TweetDetailV2 } from "./detail";
import { TweetSendForm } from "./send";
import { clientV2 } from "../lib/twitterapi_v2";
import { getErrorMessage } from "../lib/utils";

export function LogoutAction(): ReactElement {
  const handle = async () => {
    await resetOAuthTokens();
    await popToRoot();
  };
  return <Action title="Logout" icon={{ source: Icon.XmarkCircle }} onAction={handle} />;
}

export function ShowDetailV2Action(props: { tweet: Tweet }): ReactElement {
  return <Action.Push title="Show Tweet" icon={Icon.List} target={<TweetDetailV2 tweet={props.tweet} />} />;
}

export function OpenTweetInBrowerV2Action(props: { tweet: Tweet }): ReactElement {
  const t = props.tweet;
  return <Action.OpenInBrowser url={`https://twitter.com/${t.user.username}/status/${t.id}`} />;
}

export function ReplyTweetV2Action(props: { tweet: Tweet }) {
  return (
    <Action.Push
      title="Reply"
      target={<TweetSendForm replyTweet={props.tweet} />}
      icon={{ source: Icon.Bubble, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "w" }}
    />
  );
}

export function DeleteTweetV2Action(props: { tweet: Tweet }) {
  const [user, setUser] = useState<string | undefined>();
  useEffect(() => {
    async function fetch() {
      try {
        const u = await clientV2.me();
        setUser(u.username);
      } catch (error) {
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
        throw Error("You can only delete your own Tweets");
      }
      await clientV2.deleteTweet(t);
      showToast({ style: Toast.Style.Success, title: "Tweet deleted", message: "Tweet deletion successful" });
      popToRoot();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not delete Tweet", message: getErrorMessage(error) });
    }
  };
  if (user === t.user.username) {
    return (
      <Action title="Delete Tweet" icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }} onAction={deleteTweet} />
    );
  } else {
    return null;
  }
}
