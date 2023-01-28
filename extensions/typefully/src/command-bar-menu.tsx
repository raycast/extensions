import { MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Draft } from "./types";
import { extensionPreferences } from "./preferences";
import { getMenuBarExtraItemShortcut, getRelativeDate, getTypefullyIcon } from "./utils";

const MAX_TITLE_LENGTH = 24;

function ScheduledPostItem(props: { draft: Draft; index: number }) {
  const timeUntilPost = getRelativeDate(props.draft.scheduled_date);
  const title =
    props.draft.text_first_tweet.length > 0
      ? props.draft.text_first_tweet.slice(0, MAX_TITLE_LENGTH - timeUntilPost.length)
      : "";

  return (
    <MenuBarExtra.Item
      title={title}
      subtitle={timeUntilPost}
      shortcut={getMenuBarExtraItemShortcut(props.index)}
      onAction={() => open(`https://typefully.com/?d=${props.draft.id}`)}
    />
  );
}
export default function Command() {
  const { data: scheduledDrafts, isLoading: isLoadingScheduledDrafts } = useFetch<Draft[]>(
    "https://api.typefully.com/v1/drafts/recently-scheduled",
    {
      headers: {
        "X-API-KEY": `Bearer ${extensionPreferences.token}`,
        accept: "application/json",
      },
    }
  );

  return (
    <MenuBarExtra
      icon={getTypefullyIcon(scheduledDrafts && scheduledDrafts.length > 0)}
      title={scheduledDrafts && scheduledDrafts.length > 0 ? scheduledDrafts.length.toString() : undefined}
      isLoading={isLoadingScheduledDrafts}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Typefully"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://typefully.com")}
        />
        <MenuBarExtra.Item
          title="Open Twitter"
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={() => open("https://twitter.com")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {scheduledDrafts && scheduledDrafts.length > 0 ? (
          scheduledDrafts
            ?.slice(0, 10)
            ?.sort((a: Draft, b: Draft) => {
              return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
            })
            .map((draft, index) => <ScheduledPostItem key={draft.id} draft={draft} index={index} />)
        ) : (
          <MenuBarExtra.Item title="No scheduled posts" />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
