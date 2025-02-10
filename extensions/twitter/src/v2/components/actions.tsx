import { Action, Alert, Color, confirmAlert, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import { Tweet, User } from "../lib/twitter";
import { resetOAuthTokens } from "../lib/oauth";
import { TweetDetail } from "./detail";
import { TweetSendForm } from "./send";
import { clientV2, Fetcher } from "../lib/twitterapi_v2";
import { getErrorMessage, sleep } from "../../utils";
import { AuthorTweetList } from "./author";

export function LogoutAction(): ReactElement {
  const handle = async () => {
    await resetOAuthTokens();
    await popToRoot();
  };
  return <Action title="Logout" icon={{ source: Icon.XMarkCircle }} onAction={handle} />;
}

export function ShowDetailV2Action(props: { tweet: Tweet }): ReactElement {
  return <Action.Push title="Show Tweet" icon={Icon.List} target={<TweetDetail tweet={props.tweet} />} />;
}

export function OpenTweetInBrowerAction(props: { tweet: Tweet }): ReactElement {
  const t = props.tweet;
  return <Action.OpenInBrowser url={`https://twitter.com/${t.user.username}/status/${t.id}`} />;
}

export function ReplyTweetAction(props: { tweet: Tweet }): ReactElement {
  return (
    <Action.Push
      title="Reply"
      target={<TweetSendForm replyTweet={props.tweet} />}
      icon={{ source: Icon.Bubble, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "w" }}
    />
  );
}

export function LikeTweetAction(props: { tweet: Tweet; fetcher?: Fetcher | undefined }): ReactElement {
  const handle = async () => {
    clientV2.likeTweet(props.tweet);
    showToast({
      style: Toast.Style.Success,
      title: "Tweet liked",
    });
    if (props.fetcher) {
      await sleep(1000); // make sure data is up2date
      await props.fetcher.updateInline();
    }
  };
  return (
    <Action
      title="Like"
      icon={{ source: "heart_full.png", tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onAction={handle}
    />
  );
}

export function UnlikeTweetAction(props: { tweet: Tweet; fetcher?: Fetcher | undefined }): ReactElement {
  const handle = async () => {
    clientV2.unlikeTweet(props.tweet);
    showToast({
      style: Toast.Style.Success,
      title: "Tweet unliked",
    });
    if (props.fetcher) {
      await sleep(1000); // make sure data is up2date
      props.fetcher.updateInline();
    }
  };
  return (
    <Action
      title="Unlike"
      icon={{ source: "heart_empty.png", tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={handle}
    />
  );
}

export function RetweetAction(props: { tweet: Tweet }): ReactElement {
  const handle = async () => {
    clientV2.retweet(props.tweet);
    showToast({
      style: Toast.Style.Success,
      title: "Tweet Retweeted",
    });
  };
  return (
    <Action
      title="Retweet"
      icon={{ source: "retweet.png", tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
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
      if (
        await confirmAlert({
          title: "Delete the Tweet?",
          icon: "🗑️",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        await clientV2.deleteTweet(t);
        showToast({ style: Toast.Style.Success, title: "Tweet deleted", message: "Tweet deletion successful" });
        popToRoot();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not delete Tweet", message: getErrorMessage(error) });
    }
  };
  if (user === t.user.username) {
    return (
      <Action
        title="Delete Tweet"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
      title={`Tweets From @${props.tweet.user.username}`}
      target={<AuthorTweetList authorID={props.tweet.user.id} />}
      icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
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
      title="Refresh Existing Tweets"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
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
      title="Refresh Tweets"
      icon={Icon.Binoculars}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={handle}
    />
  );
}
