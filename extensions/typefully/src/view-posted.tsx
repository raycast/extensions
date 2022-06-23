import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import Preferences from "./interfaces/preferences";

dayjs.extend(relativeTime);

interface Tweet {
  id: number;
  text_first_tweet: string;
  published_on: Date;
  twitter_url: string;
}

interface State {
  tweets?: Tweet[];
  error?: Error;
}

const iconToEmojiMap = new Map<number, string>([
  [1, "1️⃣"],
  [2, "2️⃣"],
  [3, "3️⃣"],
  [4, "4️⃣"],
  [5, "5️⃣"],
  [6, "6️⃣"],
  [7, "7️⃣"],
  [8, "8️⃣"],
  [9, "9️⃣"],
  [10, "🔟"],
]);

function getIcon(index: number) {
  return iconToEmojiMap.get(index) ?? "⏺";
}

function ScheduledListItem(props: { item: Tweet; index: number }) {
  const icon = getIcon(props.index + 1);
  const publishingOn = dayjs(props.item.published_on).format("MMM DD, YYYY");
  const daysUntilPublishing = dayjs(props.item.published_on).from(dayjs());

  return (
    <List.Item
      icon={icon}
      title={props.item.text_first_tweet}
      accessoryTitle={`${publishingOn} (${daysUntilPublishing})`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.item.twitter_url} title="Open Tweet" />
          <Action.OpenInBrowser url={`https://typefully.com/?d=${props.item.id}`} title="Open Tweet in Typefully" />
        </ActionPanel>
      }
    />
  );
}

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchScheduledDrafts() {
      const response = await got.get("https://api.typefully.com/v1/drafts/recently-published", {
        headers: {
          "X-API-KEY": `Bearer ${preferences.token}`,
        },
      });

      const tweets = JSON.parse(response.body);
      const sortedTweetsByDate = tweets.sort((a: Tweet, b: Tweet) => {
        return new Date(b.published_on).getTime() - new Date(a.published_on).getTime();
      });

      setState({ tweets: sortedTweetsByDate });
    }

    fetchScheduledDrafts();
  }, []);

  return (
    <List isLoading={!state.tweets && !state.error}>
      {state.tweets?.map((tweet, index) => (
        <ScheduledListItem key={index} item={tweet} index={index} />
      ))}
    </List>
  );
};

export default Command;
