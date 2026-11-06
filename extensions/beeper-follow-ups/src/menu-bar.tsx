import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
} from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { client, createOAuth, settings } from "./api";
import { loadReplyQueue } from "./core";
import { ageDays, readHandled } from "./handled";

function BeeperMenuBar() {
  const prefs = settings();
  const days = [7, 14, 30].includes(Number(prefs.lookbackDays))
    ? Number(prefs.lookbackDays)
    : 14;
  const { data, isLoading, error } = usePromise(async () => {
    const [queue, handled] = await Promise.all([
      loadReplyQueue(client(), days, prefs.includeMuted === true),
      readHandled(),
    ]);
    return queue.items.filter(
      (item) => handled[item.chat.id] !== item.message.id,
    );
  });
  const items = data ?? [];
  const stale = items.filter(
    (item) => ageDays(item.message.timestamp) >= 3,
  ).length;
  const open = () =>
    launchCommand({ name: "awaiting-reply", type: LaunchType.UserInitiated });

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Bubble,
        tintColor: error
          ? Color.SecondaryText
          : stale
            ? Color.Orange
            : undefined,
      }}
      title={items.length ? String(items.length) : undefined}
      tooltip={
        error
          ? "Beeper: not connected"
          : `${items.length} conversations awaiting your reply`
      }
    >
      {error ? (
        <MenuBarExtra.Item
          title="Couldn't reach Beeper"
          icon={Icon.Warning}
          onAction={open}
        />
      ) : null}
      {items.length ? (
        <MenuBarExtra.Section title="Awaiting Your Reply">
          {items.slice(0, 15).map((item) => {
            const age = ageDays(item.message.timestamp);
            return (
              <MenuBarExtra.Item
                key={item.chat.id}
                title={
                  item.chat.title.length > 40
                    ? `${item.chat.title.slice(0, 39)}…`
                    : item.chat.title
                }
                subtitle={`${item.chat.network} · ${age === 0 ? "today" : `${age}d`}`}
                icon={{
                  source: Icon.Message,
                  tintColor:
                    age >= 7 ? Color.Red : age >= 3 ? Color.Orange : undefined,
                }}
                onAction={() =>
                  client()
                    .focus({
                      chatID: item.message.chatID,
                      messageID: item.message.id,
                    })
                    .catch(() => undefined)
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      ) : !isLoading && !error ? (
        <MenuBarExtra.Item title="Inbox zero 🎉" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Review All…"
          icon={Icon.List}
          onAction={open}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(createOAuth())(BeeperMenuBar);
