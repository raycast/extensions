import { showError } from "@chrismessina/raycast-kit";
import { Clipboard, Color, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchConversations, fetchNetworkRequests } from "./lib/api";
import { SIGN_IN_REQUIRED } from "./lib/cosign-mcp";
import { clipboardText } from "./lib/errors";
import { truncate } from "./lib/format";
import { absolute, COSIGN_ORIGIN, unreadCount, withHandles } from "./lib/inbox";
import { avatar } from "./lib/meta";

const PREVIEW_MAX = 40;

async function openInbox() {
  try {
    await launchCommand({ name: "inbox", type: LaunchType.UserInitiated });
  } catch (error) {
    await showError(error, { title: "Couldn’t open the inbox" });
  }
}

async function load() {
  // One conversation read plus up to five request-page reads per refresh. No thread bodies: the menu bar only needs counts and previews.
  const [conversations, requests] = await Promise.all([fetchConversations(), fetchNetworkRequests()]);
  return { conversations, requests: requests.page, complete: requests.isDone };
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(load, [], { keepPreviousData: true });
  const count = data ? unreadCount(data.conversations, data.requests) : 0;
  const unread = data?.conversations.filter((c) => c.unread) ?? [];
  const pending = data?.requests.filter((r) => !r.closed) ?? [];
  // One pass over both sections: the same name in "Connection Requests" and "Unread Messages" must also read differently.
  const titles = withHandles([
    ...pending.map((r) => ({ name: r.name })),
    ...unread.map((c) => ({ name: c.counterpart.name, handle: c.counterpart.xUsername })),
  ]);
  const requestTitles = titles.slice(0, pending.length);
  const threadTitles = titles.slice(pending.length);
  const needsSignIn = error?.message === SIGN_IN_REQUIRED;

  return (
    <MenuBarExtra
      icon={{ source: "on-cosign.svg", tintColor: Color.PrimaryText }}
      title={count > 0 || data?.complete === false ? `${count}${data?.complete === false ? "+" : ""}` : undefined}
      tooltip="Cosign Inbox"
      isLoading={isLoading}
    >
      {needsSignIn ? <MenuBarExtra.Item title="Sign in to Cosign…" onAction={openInbox} /> : null}
      {error && !needsSignIn ? (
        <MenuBarExtra.Item
          title="Something went wrong! Click to copy error."
          icon={Icon.ExclamationMark}
          onAction={() => Clipboard.copy(clipboardText("Couldn’t load the inbox", error))}
        />
      ) : null}
      {pending.length ? (
        <MenuBarExtra.Section title="Connection Requests">
          {pending.map((r, i) => (
            <MenuBarExtra.Item
              key={r.reviewKey}
              icon={avatar(r.imageUrl)}
              title={requestTitles[i]}
              subtitle={r.tagline ? truncate(r.tagline, PREVIEW_MAX) : undefined}
              onAction={() => open(absolute(r.profileUrl))}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {unread.length ? (
        <MenuBarExtra.Section title="Unread Messages">
          {unread.map((c, i) => (
            <MenuBarExtra.Item
              key={c.threadId}
              icon={avatar(c.counterpart.imageUrl)}
              title={threadTitles[i]}
              subtitle={c.lastMessagePreview ? truncate(c.lastMessagePreview, PREVIEW_MAX) : undefined}
              onAction={() => open(absolute(c.url))}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {data?.complete === false ? (
        <MenuBarExtra.Item
          title="Some requests aren’t shown"
          onAction={() => open(`${COSIGN_ORIGIN}/signals?view=open`)}
        />
      ) : null}
      {!needsSignIn && !error && !count && !isLoading && data?.complete !== false ? (
        <MenuBarExtra.Item title="All caught up! Now get out there!" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Cosign Inbox" icon={Icon.Tray} onAction={openInbox} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
