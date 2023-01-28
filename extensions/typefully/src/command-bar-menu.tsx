import { MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Draft } from "./types";
import { extensionPreferences } from "./preferences";
import {
  getMenuBarExtraItemShortcut,
  getMenuBarExtraItemTitle,
  getRelativeDate,
  getTypefullyIcon,
  sortByPublished,
  sortByScheduled,
} from "./utils";

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

  const { data: publishedDrafts, isLoading: isLoadingPublishedDrafts } = useFetch<Draft[]>(
    "https://api.typefully.com/v1/drafts/recently-published/",
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
      isLoading={isLoadingScheduledDrafts || isLoadingPublishedDrafts}
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
      {scheduledDrafts && scheduledDrafts.length > 0 ? (
        <MenuBarExtra.Section title="Queue">
          {scheduledDrafts
            ?.slice(9)
            ?.sort(sortByScheduled)
            .map((draft, index) => (
              <MenuBarExtra.Item
                key={draft.id}
                title={getMenuBarExtraItemTitle(draft)}
                subtitle={getRelativeDate(draft)}
                shortcut={getMenuBarExtraItemShortcut(index, ["ctrl"])}
                onAction={() => open(`https://typefully.com/?d=${draft.id}`)}
              />
            ))}
        </MenuBarExtra.Section>
      ) : null}
      {publishedDrafts && publishedDrafts.length > 0 ? (
        <MenuBarExtra.Section title="Tweeted">
          {publishedDrafts
            ?.slice(0, 9)
            ?.sort(sortByPublished)
            .map((draft, index) => (
              <MenuBarExtra.Item
                key={draft.id}
                title={getMenuBarExtraItemTitle(draft)}
                subtitle={getRelativeDate(draft)}
                shortcut={getMenuBarExtraItemShortcut(index)}
                onAction={() => open(`https://typefully.com/?d=${draft.id}`)}
              />
            ))}
        </MenuBarExtra.Section>
      ) : null}
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
