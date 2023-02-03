import { Clipboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import {
  getFlattenInboxNotifications,
  getMenuBarExtraItemShortcut,
  getMenuBarExtraItemDraftTitle,
  getMenuBarExtraTitle,
  getMenuBarExtraItemNotificationSubtitle,
  getMenuBarExtraItemNotificationTitle,
  getRelativeDate,
  getTypefullyIcon,
  sortByCreated,
  sortByPublished,
  sortByScheduled,
  getMenuBarItemNotificationTooltip,
  getFlattenAcivityNotifications,
  getMenuBarExtraNotificationKey,
  getMenuBarExtraItemIcon,
} from "./utils";
import { useNotifications, usePublishedDrafts, useScheduledDrafts } from "./typefully";

export default function Command() {
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications();
  const { data: scheduledDrafts, isLoading: isLoadingScheduledDrafts } = useScheduledDrafts();
  const { data: publishedDrafts, isLoading: isLoadingPublishedDrafts } = usePublishedDrafts();

  const inbox = getFlattenInboxNotifications(notifications);
  const activity = getFlattenAcivityNotifications(notifications);

  return (
    <MenuBarExtra
      icon={getTypefullyIcon(inbox.length > 0)}
      title={getMenuBarExtraTitle(inbox, scheduledDrafts)}
      isLoading={isLoadingNotifications || isLoadingScheduledDrafts || isLoadingPublishedDrafts}
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
      {inbox && inbox.length > 0 ? (
        <MenuBarExtra.Section title="Inbox">
          {inbox
            ?.slice(0, 9)
            ?.sort(sortByCreated)
            .map((notification, index) => (
              <MenuBarExtra.Item
                key={getMenuBarExtraNotificationKey(notification)}
                icon={getMenuBarExtraItemIcon(notification)}
                title={getMenuBarExtraItemNotificationTitle(notification)}
                subtitle={getMenuBarExtraItemNotificationSubtitle(notification)}
                tooltip={getMenuBarItemNotificationTooltip(notification)}
                shortcut={getMenuBarExtraItemShortcut(index, ["ctrl"])}
                onAction={() => open(`https://typefully.com/?d=${notification.payload.draft_id}`)}
              />
            ))}
        </MenuBarExtra.Section>
      ) : null}
      {scheduledDrafts && scheduledDrafts.length > 0 ? (
        <MenuBarExtra.Section title="Queue">
          {scheduledDrafts
            ?.slice(0, 9)
            ?.sort(sortByScheduled)
            .map((draft, index) => (
              <MenuBarExtra.Item
                key={draft.id}
                title={getMenuBarExtraItemDraftTitle(draft)}
                subtitle={getRelativeDate(draft)}
                tooltip={draft.text}
                shortcut={getMenuBarExtraItemShortcut(index, ["cmd"])}
                onAction={async (event) => {
                  if (event.type === "left-click") {
                    await open(`https://typefully.com/?d=${draft.id}`);
                  } else {
                    await Clipboard.copy(`https://typefully.com/?d=${draft.id}`);
                  }
                }}
              />
            ))}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        {publishedDrafts && publishedDrafts.length > 0 ? (
          <MenuBarExtra.Submenu title="Tweeted">
            {publishedDrafts
              ?.slice(0, 9)
              ?.sort(sortByPublished)
              .map((draft) => (
                <MenuBarExtra.Item
                  key={draft.id}
                  title={getMenuBarExtraItemDraftTitle(draft)}
                  subtitle={getRelativeDate(draft)}
                  tooltip={draft.text}
                  onAction={async (event) => {
                    if (event.type === "left-click") {
                      await open(`https://typefully.com/?d=${draft.id}`);
                    } else if (event.type === "right-click" && draft.twitter_url) {
                      await open(draft.twitter_url);
                    }
                  }}
                />
              ))}
          </MenuBarExtra.Submenu>
        ) : null}
        {activity && activity.length > 0 ? (
          <MenuBarExtra.Submenu title="Activity">
            {activity
              ?.slice(0, 9)
              ?.sort(sortByCreated)
              .map((notification) => (
                <MenuBarExtra.Item
                  key={getMenuBarExtraNotificationKey(notification)}
                  icon={getMenuBarExtraItemIcon(notification)}
                  title={getMenuBarExtraItemNotificationTitle(notification)}
                  subtitle={getMenuBarExtraItemNotificationSubtitle(notification)}
                  tooltip={getMenuBarItemNotificationTooltip(notification)}
                  onAction={() => open(`https://typefully.com/?d=${notification.payload.draft_id}`)}
                />
              ))}
          </MenuBarExtra.Submenu>
        ) : null}
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
