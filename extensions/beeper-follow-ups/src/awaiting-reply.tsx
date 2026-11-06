import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ageDays, readHandled, setHandled } from "./handled";
import { client, createOAuth, settings } from "./api";
import {
  escapeMarkdown,
  handoffDraft,
  loadReplyQueue,
  messagePreview,
  ReplyItem,
} from "./core";

async function openConversation(item: ReplyItem) {
  try {
    const result = await client().focus({
      chatID: item.message.chatID,
      messageID: item.message.id,
    });
    if (!result.success)
      throw new Error("Beeper did not open the conversation.");
    await closeMainWindow();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Conversation",
      message: "Check that Beeper is running and the API is connected.",
    });
  }
}
function DraftForm({ item }: { item: ReplyItem }) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const {
    data: recipient,
    isLoading,
    error: recipientError,
  } = usePromise(
    async (id: string) => client().retrieveChat(id),
    [item.message.chatID],
  );
  async function submit(values: { text: string }) {
    if (busy || isLoading || !recipient || recipientError) return;
    setBusy(true);
    try {
      await handoffDraft(client(), item.message.chatID, values.text);
      await closeMainWindow();
      await showToast({
        style: Toast.Style.Success,
        title: "Draft Requested in Beeper",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Check the local Beeper connection.";
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Prepare Draft",
        message,
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      navigationTitle={`Draft to ${recipient?.title ?? item.chat.title}`}
      isLoading={busy || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Prepare Draft in Beeper"
            icon={Icon.Pencil}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          recipientError
            ? "Could not verify the recipient. Reopen this form after checking Beeper."
            : `Recipient: ${recipient?.title ?? item.chat.title} · ${recipient?.network ?? item.chat.network}. This opens an unsent draft in Beeper. Review and send there.`
        }
      />
      <Form.TextArea
        id="text"
        title="Message"
        placeholder="Write a draft…"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
function ConversationActions({
  item,
  refresh,
  handled,
  toggleHandled,
  toggleDetail,
}: {
  item: ReplyItem;
  refresh: () => void;
  handled: boolean;
  toggleHandled: () => void;
  toggleDetail: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Open Conversation in Beeper"
        icon={Icon.AppWindow}
        onAction={() => openConversation(item)}
      />
      <Action.Push
        title="Prepare Draft"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<DraftForm item={item} />}
      />
      <Action
        title={handled ? "Move Back to Awaiting Reply" : "Mark as Handled"}
        icon={handled ? Icon.ArrowCounterClockwise : Icon.CheckCircle}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "d" },
          Windows: { modifiers: ["ctrl"], key: "d" },
        }}
        onAction={toggleHandled}
      />
      <Action
        title="Toggle Message Preview"
        icon={Icon.Sidebar}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "p" },
          Windows: { modifiers: ["ctrl", "shift"], key: "p" },
        }}
        onAction={toggleDetail}
      />
      <Action.Push
        title="Read Message"
        icon={Icon.Message}
        target={
          <Detail
            markdown={messagePreview(item)}
            actions={
              <ActionPanel>
                <Action
                  title="Open Conversation in Beeper"
                  icon={Icon.AppWindow}
                  onAction={() => openConversation(item)}
                />
                <Action.Push
                  title="Prepare Draft"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<DraftForm item={item} />}
                />
              </ActionPanel>
            }
          />
        }
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </ActionPanel>
  );
}
function Command() {
  const prefs = settings();
  const days = [7, 14, 30].includes(Number(prefs.lookbackDays))
    ? Number(prefs.lookbackDays)
    : 14;
  const { data, isLoading, error, revalidate } = usePromise(
    async (days: number, includeMuted: boolean) =>
      loadReplyQueue(client(), days, includeMuted),
    [days, prefs.includeMuted === true],
    { onError: () => undefined },
  );
  const [network, setNetwork] = useState("all");
  const [handled, setHandledState] = useState<Record<string, string>>({});
  const [showDetail, setShowDetail] = useState(true);
  useEffect(() => {
    void readHandled().then(setHandledState);
  }, []);
  const showingHandled = network === "handled";
  const allItems = data?.items ?? [];
  const items = allItems.filter((i) =>
    showingHandled
      ? handled[i.chat.id] === i.message.id
      : handled[i.chat.id] !== i.message.id,
  );
  async function toggleHandled(item: ReplyItem) {
    const done = handled[item.chat.id] === item.message.id;
    setHandledState(
      await setHandled(item.chat.id, done ? undefined : item.message.id),
    );
    await showToast({
      style: Toast.Style.Success,
      title: done ? "Moved back to awaiting reply" : "Marked as handled",
      message: done
        ? item.chat.title
        : "It will come back if they message again.",
    });
  }
  const networks = Array.from(
    new Set([
      ...allItems.map((i) => i.chat.network),
      ...(network === "all" || network === "handled" ? [] : [network]),
    ]),
  ).sort();
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && items.length > 0}
      searchBarPlaceholder="Filter conversations awaiting a reply…"
      navigationTitle="Conversations Awaiting Reply"
      searchBarAccessory={
        <List.Dropdown tooltip="Network" value={network} onChange={setNetwork}>
          <List.Dropdown.Item
            value="all"
            title="All Networks"
            icon={Icon.Globe}
          />
          <List.Dropdown.Section title="Networks">
            {networks.map((n) => (
              <List.Dropdown.Item key={n} value={n} title={n} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item
              value="handled"
              title="Marked as Handled"
              icon={Icon.CheckCircle}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Scan Conversations"
          description="Check Beeper Settings → Developers and reconnect if authorization expired."
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section
            title={`Latest incoming message · ${days} days`}
            subtitle={data ? `${data.scanned} conversations scanned` : ""}
          >
            {items
              .filter(
                (i) =>
                  network === "all" ||
                  network === "handled" ||
                  i.chat.network === network,
              )
              .map((item) => {
                const age = ageDays(item.message.timestamp);
                const ageColor =
                  age >= 7 ? Color.Red : age >= 3 ? Color.Orange : undefined;
                return (
                  <List.Item
                    key={item.chat.id}
                    title={item.chat.title}
                    subtitle={showDetail ? undefined : item.chat.network}
                    icon={{ source: Icon.Message, tintColor: ageColor }}
                    keywords={[
                      item.message.senderName ?? "",
                      item.chat.network,
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={`### ${escapeMarkdown(item.message.senderName ?? item.chat.title)}\n\n${messagePreview(item)}`}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label
                              title="Network"
                              text={item.chat.network}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Received"
                              text={new Date(
                                item.message.timestamp,
                              ).toLocaleString()}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Waiting"
                              text={
                                age === 0
                                  ? "Today"
                                  : `${age} day${age === 1 ? "" : "s"}`
                              }
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    accessories={[
                      {
                        date: {
                          value: new Date(item.message.timestamp),
                          color: ageColor,
                        },
                      },
                      ...(item.chat.unreadCount > 0
                        ? [
                            {
                              tag: {
                                value: `${item.chat.unreadCount} unread`,
                                color: Color.Blue,
                              },
                            },
                          ]
                        : []),
                    ]}
                    actions={
                      <ConversationActions
                        item={item}
                        refresh={revalidate}
                        handled={handled[item.chat.id] === item.message.id}
                        toggleHandled={() => toggleHandled(item)}
                        toggleDetail={() => setShowDetail((value) => !value)}
                      />
                    }
                  />
                );
              })}
          </List.Section>
          {data?.failed || data?.hasMore || data?.inconclusive ? (
            <List.Section title="Scan Coverage">
              <List.Item
                title="Results May Be Incomplete"
                subtitle={`${data.failed} failed · ${data.inconclusive} inconclusive${data.hasMore ? " · more conversations available" : ""}`}
                icon={Icon.Warning}
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
          {!isLoading ? (
            <List.EmptyView
              icon={items.length ? Icon.MagnifyingGlass : Icon.CheckCircle}
              title={
                items.length
                  ? "No Matching Conversations"
                  : "No Conversations Found"
              }
              description={
                items.length
                  ? "Change the search or choose All Networks, or refresh the conversation scan."
                  : `No scanned direct conversation in your primary inbox has a latest incoming message in this ${days}-day activity window.`
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  {network !== "all" ? (
                    <Action
                      title="Show All Networks"
                      icon={Icon.Globe}
                      onAction={() => setNetwork("all")}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}
export default withAccessToken(createOAuth())(Command);
