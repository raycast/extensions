import { Icon, Keyboard, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { describeError } from "./lib/errors";
import { nyxe, openInboxInNyxe, openThreadInNyxe, showApiError } from "./lib/raycast";
import { displayAddress } from "./lib/text";

/** Polls `/inbox/summary` (one cheap call) every minute. */
export default function MenuBarInbox() {
  const { data, isLoading, error } = useCachedPromise(() => nyxe().inboxSummary(), [], {
    // The menu bar can't show a toast worth reading every minute; the title
    // simply keeps the last good count.
    onError: () => undefined,
  });

  // A bad token (or no network) would otherwise leave an empty menu with no
  // reason, so say what's wrong and offer the way out. A passing blip over a
  // cached inbox stays quiet; a token problem never does, and hides the cached
  // threads: a revoked token shouldn't keep showing the mail it can't read.
  const described = error ? describeError(error) : null;
  const failure = described && (!data || described.offerTokens) ? described : null;
  const shown = failure?.offerTokens ? undefined : data;
  const unread = shown?.unread ?? 0;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }}
      title={failure ? "!" : unread > 0 ? String(unread) : undefined}
      tooltip={failure ? failure.title : unread > 0 ? `${unread} unread in Nyxe` : "Nyxe"}
    >
      {failure ? (
        <MenuBarExtra.Section title={failure.title}>
          {failure.message ? <MenuBarExtra.Item title={truncate(failure.message, 60)} /> : null}
          <MenuBarExtra.Item
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title={unread > 0 ? `${unread} unread` : "Inbox"}>
        {(shown?.threads ?? []).map((t) => (
          <MenuBarExtra.Item
            key={t.threadId}
            icon={t.isUnread ? Icon.CircleFilled : Icon.Envelope}
            title={truncate(t.subject?.trim() || "(no subject)", 48)}
            subtitle={truncate(displayAddress(t.from), 24)}
            onAction={() => openThreadInNyxe(t.threadId).catch((err) => showApiError(err))}
          />
        ))}
        {shown && shown.threads.length === 0 ? <MenuBarExtra.Item title="Inbox zero" /> : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Inbox"
          icon={Icon.Tray}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openInboxInNyxe().catch((err) => showApiError(err))}
        />
        <MenuBarExtra.Item
          title="Compose"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "send-email", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
}
