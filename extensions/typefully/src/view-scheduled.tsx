import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import Preferences from "./interfaces/preferences";

dayjs.extend(relativeTime);

interface Draft {
  id: number;
  text_first_tweet: string;
  num_tweets: number;
  scheduled_date: Date;
}

interface State {
  drafts?: Draft[];
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

function ScheduledListItem(props: { item: Draft; index: number }) {
  const icon = getIcon(props.index + 1);
  const publishingOn = dayjs(props.item.scheduled_date).format("MMM DD, YYYY");
  const daysUntilPublishing = dayjs().to(dayjs(props.item.scheduled_date));

  return (
    <List.Item
      icon={icon}
      title={props.item.text_first_tweet}
      accessoryTitle={`${publishingOn} (${daysUntilPublishing})`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://typefully.com/?d=${props.item.id}`} title="Open Draft in Typefully" />
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
      const response = await got.get("https://api.typefully.com/v1/drafts/recently-scheduled", {
        headers: {
          "X-API-KEY": `Bearer ${preferences.token}`,
        },
      });

      const drafts = JSON.parse(response.body);
      const sortedDraftsByDate = drafts.sort((a: Draft, b: Draft) => {
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });

      setState({ drafts: sortedDraftsByDate });
    }

    fetchScheduledDrafts();
  }, []);

  return (
    <List isLoading={!state.drafts && !state.error}>
      {state.drafts?.map((draft, index) => (
        <ScheduledListItem key={index} item={draft} index={index} />
      ))}
    </List>
  );
};

export default Command;
