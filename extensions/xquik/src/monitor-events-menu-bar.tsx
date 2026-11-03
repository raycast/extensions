import {
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { SITE_URL } from "./lib/api";
import { describeError, ErrorFix } from "./lib/errors";
import { eventLabel, eventPost, fetchEventPage, newestEventDate, unseenEvents } from "./lib/events";
import { postLink, postTitle } from "./lib/format";
import { MonitorEvent } from "./lib/schemas";

const SHOWN_EVENTS = 10;
const TITLE_LENGTH = 48;

const shorten = (text: string) => (text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1)}…` : text);

const loadEvents = async () => (await fetchEventPage({})).events;

function openEvents() {
  return launchCommand({ name: "view-monitor-events", type: LaunchType.UserInitiated });
}

function EventItem({ event, isNew }: { event: MonitorEvent; isNew: boolean }) {
  const post = eventPost(event);
  const source = event.username ? `@${event.username}` : (event.query ?? undefined);
  const avatar = post?.author?.profilePicture;
  return (
    <MenuBarExtra.Item
      title={shorten(post ? postTitle(post.text) : eventLabel(event.type))}
      subtitle={post ? eventLabel(event.type) : source}
      tooltip={source}
      icon={avatar ? { source: avatar, mask: Image.Mask.Circle } : isNew ? Icon.Dot : Icon.Bell}
      onAction={() => (post ? open(postLink(post)) : openEvents())}
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
          onAction={() => launchCommand({ name: "manage-monitors", type: LaunchType.UserInitiated })}
        />
      )}
      {events.length > 0 && (
        <MenuBarExtra.Section title={unseen.length ? `${unseen.length} New` : "Latest Events"}>
          {events.slice(0, SHOWN_EVENTS).map((event) => (
            <EventItem key={event.id} event={event} isNew={unseen.includes(event)} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All Events"
          icon={Icon.List}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={async () => {
            await markSeen();
            await openEvents();
          }}
        />
        {unseen.length > 0 && (
          <MenuBarExtra.Item title="Mark All as Seen" icon={Icon.CheckCircle} onAction={markSeen} />
        )}
        <MenuBarExtra.Item
          title="Manage Monitors"
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "manage-monitors", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
