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

const sortAscByDateFn = (draftA: Draft, draftB: Draft): number => {
  return new Date(draftA.scheduled_date).getTime() - new Date(draftB.scheduled_date).getTime();
};

const ScheduledPostItem = (props: ScheduledPostItemProps) => {
  const MAX_TITLE_LENGTH = 24;

  const timeUntilPost = dayjs().to(dayjs(props.draft.scheduled_date));
  const title =
    props.draft.text_first_tweet.length > 0
      ? props.draft.text_first_tweet.slice(0, MAX_TITLE_LENGTH - timeUntilPost.length)
      : "";

  return (
    <MenuBarExtra.Item
      key={props.draft.id}
      title={`${title}... (${timeUntilPost})`}
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
    <MenuBarExtra
      icon={{
        source: {
          light: "black-feather.svg",
          dark: "white-feather.svg",
        },
      }}
      tooltip="Your Pull Requests"
      title={data && data.length > 0 ? data.length.toString() : undefined}
      isLoading={isLoading}
    >
      {/* Quick Links */}
      <MenuBarExtra.Section title="Quick Links">
        <MenuBarExtra.Item title="Open Typefully" onAction={() => open("https://typefully.com")} />
        <MenuBarExtra.Item title="Open Twitter" onAction={() => open("https://twitter.com")} />
      </MenuBarExtra.Section>

      {/* Scheduled Posts */}
      <MenuBarExtra.Section title="Upcoming Scheduled Posts">
        {data === undefined || data.length === 0 ? (
          <MenuBarExtra.Item title="No posts found. 😔" />
        ) : (
          data
            .sort(sortAscByDateFn)
            .slice(0, 5)
            .map((draft) => <ScheduledPostItem key={draft.id} draft={draft} />)
        )}

        {/* Optional extra, if there are > 5 posts */}
        {data !== undefined && data.length > 5 && (
          <MenuBarExtra.Item title="... more posts later" onAction={() => open(`https://typefully.com/`)} />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
