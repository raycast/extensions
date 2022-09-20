import got from "got";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getPreferenceValues, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Draft } from "./interfaces/draft";
import { Preferences } from "./interfaces/preferences";

dayjs.extend(relativeTime);

interface ScheduledPostItemProps {
  draft: Draft;
}

const ScheduledPostItem = (props: ScheduledPostItemProps) => {
  const maxTitleLength = 24;
  const timeUntilPost = dayjs().to(dayjs(props.draft.scheduled_date));

  return (
    <MenuBarExtra.Item
      key={props.draft.id}
      title={`${props.draft.text_first_tweet.slice(0, maxTitleLength - timeUntilPost.length)}... (${timeUntilPost})`}
      onAction={() => open(`https://typefully.com/?d=${props.draft.id}`)}
    />
  );
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data } = useCachedPromise(
    async (url: string): Promise<Array<Draft>> => {
      const drafts: Array<Draft> = await got
        .get(url, {
          headers: {
            "X-API-KEY": `Bearer ${preferences.token}`,
          },
          responseType: "json",
        })
        .json();

      const sortedDraftsByDate = drafts.sort((a: Draft, b: Draft) => {
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });

      return sortedDraftsByDate;
    },
    ["https://api.typefully.com/v1/drafts/recently-scheduled"],
    {
      keepPreviousData: true,
    }
  );

  return (
    <MenuBarExtra icon="https://typefully.com/icon/favicon.ico" tooltip="Your Pull Requests">
      <MenuBarExtra.Item title="Upcoming Scheduled Posts" />
      {isLoading ? (
        <MenuBarExtra.Item title="Loading..." />
      ) : (
        (data || []).map((draft) => <ScheduledPostItem key={draft.id} draft={draft} />)
      )}
    </MenuBarExtra>
  );
}
