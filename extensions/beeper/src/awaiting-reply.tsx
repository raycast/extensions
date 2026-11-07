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
import { showFailureToast, useForm, usePromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { ageDays, readHandled, setHandled } from "./follow-ups/handled";
import { createBeeperOAuth } from "./api";
import { followUpClient as client, followUpSettings } from "./follow-ups/client";
import { escapeMarkdown, handoffDraft, loadReplyQueue, messagePreview, ReplyItem } from "./follow-ups/core";
import { networkOf } from "./follow-ups/core";

async function openConversation(item: ReplyItem) {
  try {
    const result = await client().focus({
      chatID: item.message.chatID,
      messageID: item.message.id,
    });
    if (!result.success) throw new Error("Beeper did not open the conversation.");
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Open Conversation",
      message: "Check that Beeper is running and the API is connected.",
    });
  }
}
function DraftForm({ item }: { item: ReplyItem }) {
  const [busy, setBusy] = useState(false);
  const {
    data: recipient,
    isLoading,
    error: recipientError,
  } = usePromise(async (id: string) => client().retrieveChat(id), [item.message.chatID]);
  const { handleSubmit, itemProps, setValidationError } = useForm<{ text: string }>({
    async onSubmit(values) {
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
        setValidationError("text", e instanceof Error ? e.message : "Check the local Beeper connection.");
        await showFailureToast(e, { title: "Could Not Prepare Draft" });
      } finally {
        setBusy(false);
      }
    },
  });
  return (
    <Form
      navigationTitle={`Draft to ${recipient?.title ?? item.chat.title}`}
      isLoading={busy || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Prepare Draft in Beeper" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          recipientError
            ? "Could not verify the recipient. Reopen this form after checking Beeper."
            : `Recipient: ${recipient?.title ?? item.chat.title} · ${recipient ? networkOf(recipient) : networkOf(item.chat)}. This opens an unsent draft in Beeper. Review and send there.`
        }
      />
      <Form.TextArea title="Message" placeholder="Write a draft…" {...itemProps.text} />
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
      <Action title="Open Conversation in Beeper" icon={Icon.AppWindow} onAction={() => openConversation(item)} />
      <Action.Push title="Prepare Draft" icon={Icon.Pencil} target={<DraftForm item={item} />} />
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
                <Action.Push title="Prepare Draft" icon={Icon.Pencil} target={<DraftForm item={item} />} />
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
  const { days, includeMuted } = followUpSettings();
  const { data, isLoading, error, revalidate } = usePromise(
    async (days: number, includeMuted: boolean) => loadReplyQueue(client(), days, includeMuted),
    [days, includeMuted],
    { onError: () => undefined },
  );
  const [network, setNetwork] = useState("all");
  const { data: handledData, mutate: mutateHandled } = usePromise(readHandled);
  const handled = handledData ?? {};
  const [showDetail, setShowDetail] = useState(true);
  const showingHandled = network === "handled";
  const allItems = data?.items ?? [];
  const items = allItems.filter((i) =>
    showingHandled ? handled[i.chat.id] === i.message.id : handled[i.chat.id] !== i.message.id,
  );
  async function toggleHandled(item: ReplyItem) {
    const done = handled[item.chat.id] === item.message.id;
    try {
      await mutateHandled(setHandled(item.chat.id, done ? undefined : item.message.id), {
        optimisticUpdate: (current = {}) => {
          const next = { ...current };
          if (done) delete next[item.chat.id];
          else next[item.chat.id] = item.message.id;
          return next;
        },
        shouldRevalidateAfter: false,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Update Conversation" });
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: done ? "Moved back to awaiting reply" : "Marked as handled",
      message: done ? item.chat.title : "It will come back if they message again.",
    });
  }
  const networks = Array.from(
    new Set([
      ...allItems.map((i) => networkOf(i.chat)),
      ...(network === "all" || network === "handled" ? [] : [network]),
    ]),
  ).sort();
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && items.length > 0}
      searchBarPlaceholder="Filter conversations awaiting a reply…"
      searchBarAccessory={
        <List.Dropdown tooltip="Network" value={network} onChange={setNetwork}>
          <List.Dropdown.Item value="all" title="All Networks" icon={Icon.Globe} />
          <List.Dropdown.Section title="Networks">
            {networks.map((n) => (
              <List.Dropdown.Item key={n} value={n} title={n} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item value="handled" title="Marked as Handled" icon={Icon.CheckCircle} />
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
                icon={Icon.ArrowClockwise}
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
              .filter((i) => network === "all" || network === "handled" || networkOf(i.chat) === network)
              .map((item) => {
                const age = ageDays(item.message.timestamp);
                const ageColor = age >= 7 ? Color.Red : age >= 3 ? Color.Orange : undefined;
                return (
                  <List.Item
                    key={item.chat.id}
                    title={item.chat.title}
                    subtitle={showDetail ? undefined : networkOf(item.chat)}
                    icon={{ source: Icon.Message, tintColor: ageColor }}
                    keywords={[item.message.senderName ?? "", networkOf(item.chat)]}
                    detail={
                      <List.Item.Detail
                        markdown={`### ${escapeMarkdown(item.message.senderName ?? item.chat.title)}\n\n${messagePreview(item)}`}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Network" text={networkOf(item.chat)} />
                            <List.Item.Detail.Metadata.Label
                              title="Received"
                              text={new Date(item.message.timestamp).toLocaleString()}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Waiting"
                              text={age === 0 ? "Today" : `${age} day${age === 1 ? "" : "s"}`}
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    // The detail pane hides accessories, so only pass them when it is off.
                    accessories={
                      showDetail
                        ? undefined
                        : [
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
                          ]
                    }
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
              title={items.length ? "No Matching Conversations" : "No Conversations Found"}
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
                    <Action title="Show All Networks" icon={Icon.Globe} onAction={() => setNetwork("all")} />
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
export default withAccessToken(createBeeperOAuth())(Command);
