import { Icon, Image, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { SITE_URL } from "./lib/api";
import { describeError, ErrorFix } from "./lib/errors";
import { fetchEventPage, MenuEventRow, menuEventRows, newestEventDate, unseenEvents } from "./lib/events";
import { postLink } from "./lib/format";
import { launchXquikCommand } from "./lib/launch";

const SHOWN_EVENTS = 10;

const loadEvents = async () => (await fetchEventPage({})).events;

function EventItem({ row: { post, source, title, subtitle }, isNew }: { row: MenuEventRow; isNew: boolean }) {
  const avatar = post?.author?.profilePicture;
  return (
    <MenuBarExtra.Item
      title={title}
      subtitle={subtitle}
      tooltip={source}
      icon={avatar ? { source: avatar, mask: Image.Mask.Circle } : isNew ? Icon.Dot : Icon.Bell}
      onAction={() => (post ? open(postLink(post)) : launchXquikCommand("view-monitor-events"))}
    />
  );
}

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(loadEvents, []);
  const seen = useLocalStorage<string | undefined>("events-seen-at", undefined);
  const events = data ?? [];
  const unseen = seen.isLoading ? [] : unseenEvents(events, seen.value);
  const markSeen = () => seen.setValue(newestEventDate(events) ?? new Date().toISOString());
  const failure = error && describeError(error);
  const fixes: Record<ErrorFix, () => unknown> = {
    preferences: openExtensionPreferences,
    site: () => open(SITE_URL),
    retry: revalidate,
  };

  return (
    <MenuBarExtra
      icon={Icon.Bell}
      title={unseen.length ? String(unseen.length) : undefined}
      tooltip="Xquik Monitor Events"
      isLoading={isLoading || seen.isLoading}
    >
      {failure && (
        <MenuBarExtra.Section title={failure.title}>
          <MenuBarExtra.Item title={failure.hint} icon={Icon.ExclamationMark} onAction={fixes[failure.fix]} />
        </MenuBarExtra.Section>
      )}
      {!failure && events.length === 0 && !isLoading && (
        <MenuBarExtra.Item
          title="No Events Yet"
          subtitle="Create a Monitor"
          icon={Icon.Plus}
          onAction={() => launchXquikCommand("manage-monitors")}
        />
      )}
      {events.length > 0 && (
        <MenuBarExtra.Section title={unseen.length ? `${unseen.length} New` : "Latest Events"}>
          {menuEventRows(events.slice(0, SHOWN_EVENTS)).map((row) => (
            <EventItem key={row.event.id} row={row} isNew={unseen.includes(row.event)} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All Events"
          icon={Icon.List}
          onAction={async () => {
            await markSeen();
            await launchXquikCommand("view-monitor-events");
          }}
        />
        {unseen.length > 0 && (
          <MenuBarExtra.Item title="Mark All as Seen" icon={Icon.CheckCircle} onAction={markSeen} />
        )}
        <MenuBarExtra.Item
          title="Manage Monitors"
          icon={Icon.Gear}
          onAction={() => launchXquikCommand("manage-monitors")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
