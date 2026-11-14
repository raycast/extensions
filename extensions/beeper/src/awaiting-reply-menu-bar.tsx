import { Color, Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { showFailureToast, usePromise, withAccessToken } from "@raycast/utils";
import { createBeeperOAuth } from "./api";
import { followUpClient as client, followUpSettings } from "./follow-ups/client";
import { loadReplyQueue, networkOf, ReplyItem } from "./follow-ups/core";
import { ageDays, readHandled } from "./follow-ups/handled";

async function openReviewAll() {
  try {
    await launchCommand({ name: "awaiting-reply", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Awaiting Reply" });
  }
}

async function openConversation(item: ReplyItem) {
  try {
    const result = await client().focus({ chatID: item.message.chatID, messageID: item.message.id });
    if (!result.success) throw new Error("Beeper did not open the conversation.");
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Open Conversation",
      message: "Check that Beeper is running and the API is connected.",
    });
  }
}

/** Menu items need visibly distinct text; add the sender, then a counter, when chats would look identical. */
function distinctTitles(items: ReplyItem[], subtitle: (item: ReplyItem) => string): string[] {
  const base = items.map((item) =>
    item.chat.title.length > 40 ? `${item.chat.title.slice(0, 39)}…` : item.chat.title,
  );
  const key = (title: string, index: number) => `${title}\u0000${subtitle(items[index])}`;
  const withSender = base.map((title, index) => {
    const clash = base.some((other, j) => j !== index && key(other, j) === key(title, index));
    const sender = items[index].message.senderName;
    return clash && sender && sender !== items[index].chat.title ? `${title} (${sender})` : title;
  });
  const seen = new Map<string, number>();
  return withSender.map((title, index) => {
    const k = key(title, index);
    const count = (seen.get(k) ?? 0) + 1;
    seen.set(k, count);
    return count > 1 ? `${title} #${count}` : title;
  });
}

function BeeperMenuBar() {
  const { days, includeMuted } = followUpSettings();
  const { data, isLoading, error } = usePromise(async () => {
    const [queue, handled] = await Promise.all([loadReplyQueue(client(), days, includeMuted), readHandled()]);
    return { ...queue, items: queue.items.filter((item) => handled[item.chat.id] !== item.message.id) };
  });
  const items = data?.items ?? [];
  // Failed or partial scans must not look like inbox zero.
  const incomplete = Boolean(data && (data.failed || data.inconclusive || data.hasMore));
  const stale = items.filter((item) => ageDays(item.message.timestamp) >= 3).length;
  const shown = items.slice(0, 15);
  const subtitle = (item: ReplyItem) => {
    const age = ageDays(item.message.timestamp);
    return `${networkOf(item.chat)} · ${age === 0 ? "today" : `${age}d`}`;
  };
  const titles = distinctTitles(shown, subtitle);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Bubble,
        tintColor: error ? Color.SecondaryText : stale ? Color.Orange : undefined,
      }}
      title={items.length ? `${items.length}${incomplete ? "+" : ""}` : undefined}
      tooltip={
        error
          ? "Beeper: not connected"
          : `${items.length} conversations awaiting your reply${incomplete ? " (scan incomplete)" : ""}`
      }
    >
      {error ? <MenuBarExtra.Item title="Couldn't reach Beeper" icon={Icon.Warning} onAction={openReviewAll} /> : null}
      {incomplete && data ? (
        <MenuBarExtra.Item
          title="Scan incomplete"
          subtitle={`${data.failed} failed · ${data.inconclusive} inconclusive${data.hasMore ? " · more available" : ""}`}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          onAction={openReviewAll}
        />
      ) : null}
      {shown.length ? (
        <MenuBarExtra.Section title="Awaiting Your Reply">
          {shown.map((item, index) => {
            const age = ageDays(item.message.timestamp);
            return (
              <MenuBarExtra.Item
                key={item.chat.id}
                title={titles[index]}
                subtitle={subtitle(item)}
                icon={{
                  source: Icon.Message,
                  tintColor: age >= 7 ? Color.Red : age >= 3 ? Color.Orange : undefined,
                }}
                onAction={() => openConversation(item)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ) : !isLoading && !error && !incomplete ? (
        <MenuBarExtra.Item title="Inbox zero 🎉" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Review All…" icon={Icon.List} onAction={openReviewAll} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(createBeeperOAuth())(BeeperMenuBar);
