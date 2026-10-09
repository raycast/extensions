import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openExtensionPreferences,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthError, KEYS_URL, appUrl, getMe, getUpcoming, type Booking } from "./lib/api";
import { firstName, isJoinable, isLive, isToday, shortTime, time } from "./lib/format";
import { MEET_ICON } from "./lib/ui";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(getUpcoming, [], { onError: () => undefined });
  const me = useCachedPromise(getMe, [], { onError: () => undefined });
  const today = (data || []).filter((b) => isToday(b.start_utc) || isLive(b));
  const next = today[0];
  const title = next ? `${isLive(next) ? "Now" : shortTime(next.start_utc)} ${firstName(next.guest_name)}` : undefined;

  const go = (b: Booking) => open(isJoinable(b) && b.meet_url ? b.meet_url : appUrl("bookings"));

  return (
    <MenuBarExtra
      icon={MEET_ICON}
      title={title}
      tooltip={next ? `Next: ${next.guest_name} at ${time(next.start_utc)}` : "Gaurify Meet"}
      isLoading={isLoading}
    >
      {error instanceof AuthError ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Add your API key" icon={Icon.Key} onAction={openExtensionPreferences} />
          <MenuBarExtra.Item title="Get a key in API & webhooks" onAction={() => open(KEYS_URL())} />
        </MenuBarExtra.Section>
      ) : error && !data ? (
        <MenuBarExtra.Item title="Can't reach Gaurify Meet" icon={Icon.WifiDisabled} />
      ) : (
        <MenuBarExtra.Section title={today.length ? "Today" : undefined}>
          {today.length === 0 ? <MenuBarExtra.Item title="Nothing else today" icon={Icon.Sun} /> : null}
          {today.map((b) => (
            <MenuBarExtra.Item
              key={b.id}
              icon={b.mode === "phone" ? Icon.Phone : Icon.Video}
              title={`${time(b.start_utc)}  ${b.guest_name}`}
              subtitle={isJoinable(b) ? (isLive(b) ? "Live, join" : "Join") : b.type_title || undefined}
              tooltip={isJoinable(b) ? "Join now" : "Open in Gaurify Meet"}
              onAction={() => go(b)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        {me.data ? (
          <MenuBarExtra.Item
            title="Copy Booking Link"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={async () => {
              await Clipboard.copy(me.data!.pageUrl);
              await showHUD("Copied your booking link");
            }}
          />
        ) : null}
        <MenuBarExtra.Item
          title="All Upcoming Meetings"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          onAction={() => launchCommand({ name: "upcoming-meetings", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Gaurify Meet"
          icon={MEET_ICON}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(appUrl())}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
