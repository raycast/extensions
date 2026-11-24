import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { type Account, accountColor } from "../lib/accounts";
import { cardIcon, formatDate, labelColor } from "../lib/format";
import { safeMarkdown } from "../lib/markdown";
import { api, type Card, fetchCard, userId } from "../lib/hackban";
import { ManageAccountsAction } from "./accounts";
import { MoveCardSubmenu, RefreshAction, ToggleCompleteAction, withToast } from "./actions";
import { CommentForm } from "./comment-form";

function cardMarkdown(c: Card) {
  const parts = [`# ${c.title}`];
  if (c.archived) parts.push("> This card is archived.");
  if (c.description.trim()) parts.push(c.description);
  for (const cl of c.checklists) {
    const done = cl.items.filter((i) => i.complete).length;
    const items = cl.items.map((i) => `- [${i.complete ? "x" : " "}] ${i.name}`).join("\n");
    parts.push(`### ${cl.name} (${done}/${cl.items.length})\n\n${items}`);
  }
  if (c.comments.length) {
    parts.push("### Comments");
    parts.push(
      c.comments.map((m) => `**${m.author ?? "Someone"}** · ${formatDate(m.at)}\n\n${m.text}`).join("\n\n---\n\n"),
    );
  }
  // Everything here but the headings comes from people on the board.
  return safeMarkdown(parts.join("\n\n"));
}

export function CardDetail({ account, cardId, onChange }: { account: Account; cardId: string; onChange?: () => void }) {
  const { pop } = useNavigation();
  const { data: card, isLoading, revalidate } = useCachedPromise(fetchCard, [account, cardId]);
  const { data: me } = useCachedPromise(userId, [account]);
  const hackban = api(account);

  const changed = () => {
    revalidate();
    onChange?.();
  };

  const joined = !!me && !!card?.members.some((m) => m.id === me);
  const items = card?.checklists.flatMap((cl) => cl.items.map((i) => ({ ...i, checklist: cl.name }))) ?? [];
  // Hackban only stores http(s) links and its own uploads, but don't open anything else if one slips through.
  const attachments = card?.attachments.filter((a) => /^https?:\/\//i.test(a.url)) ?? [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={card?.title ?? "Card"}
      markdown={card ? cardMarkdown(card) : undefined}
      metadata={
        card && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Account">
              <Detail.Metadata.TagList.Item text={account.label} color={accountColor(account)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Board" text={card.board.name} icon={Icon.AppWindowGrid3x3} />
            <Detail.Metadata.Label title="List" text={card.list.name} icon={Icon.AppWindowList} />
            {card.due && (
              <Detail.Metadata.Label
                title="Due"
                text={`${formatDate(card.due)}${card.dueComplete ? " · done" : ""}`}
                icon={cardIcon(card.due, card.dueComplete)}
              />
            )}
            {!card.due && card.dueComplete && (
              <Detail.Metadata.Label title="Status" text="Complete" icon={cardIcon(null, true)} />
            )}
            {card.start && <Detail.Metadata.Label title="Start" text={formatDate(card.start)} />}
            {card.recurrence && <Detail.Metadata.Label title="Repeats" text={card.recurrence} icon={Icon.Repeat} />}
            {card.labels.length > 0 && (
              <Detail.Metadata.TagList title="Labels">
                {card.labels.map((l) => (
                  <Detail.Metadata.TagList.Item key={l.id} text={l.name || " "} color={labelColor(l.color)} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {card.members.length > 0 && (
              <Detail.Metadata.TagList title="Members">
                {card.members.map((m) => (
                  <Detail.Metadata.TagList.Item key={m.id} text={m.name ?? "Unknown"} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {card.blockedBy?.map((b) => (
              <Detail.Metadata.Label key={b.id} title="Blocked by" text={b.title} icon={Icon.Lock} />
            ))}
            {card.blocking?.map((b) => (
              <Detail.Metadata.Label key={b.id} title="Blocking" text={b.title} icon={Icon.Hourglass} />
            ))}
            {attachments.length > 0 && <Detail.Metadata.Separator />}
            {attachments.map((a, i) => (
              <Detail.Metadata.Link key={i} title={i === 0 ? "Attachments" : ""} text={a.name} target={a.url} />
            ))}
          </Detail.Metadata>
        )
      }
      actions={
        card && (
          <ActionPanel title={card.title}>
            <ActionPanel.Section>
              <Action.OpenInBrowser url={card.url} />
              <ToggleCompleteAction account={account} cardId={card.id} complete={card.dueComplete} onChange={changed} />
              <Action.Push
                title="Add Comment"
                icon={Icon.Bubble}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={<CommentForm account={account} cardId={card.id} cardTitle={card.title} onCommented={changed} />}
              />
              <MoveCardSubmenu
                account={account}
                cardId={card.id}
                boardId={card.board.id}
                listId={card.list.id}
                onMoved={changed}
              />
              {items.length > 0 && (
                <ActionPanel.Submenu
                  title="Tick Checklist Item"
                  icon={Icon.CheckList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                >
                  {items.map((i) => (
                    <Action
                      key={i.id}
                      title={i.name}
                      icon={i.complete ? Icon.CheckCircle : Icon.Circle}
                      onAction={async () => {
                        const ok = await withToast(
                          {
                            loading: "Updating item",
                            success: i.complete ? "Unticked" : "Ticked",
                            failure: "Couldn't update item",
                          },
                          () => hackban.setCheckItem(i.id, !i.complete),
                        );
                        if (ok) changed();
                      }}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
              {me && (
                <Action
                  title={joined ? "Leave Card" : "Join Card"}
                  icon={joined ? Icon.RemovePerson : Icon.AddPerson}
                  shortcut={{ modifiers: ["cmd"], key: "j" }}
                  onAction={async () => {
                    const ok = await withToast(
                      joined
                        ? { loading: "Leaving card", success: "Left card", failure: "Couldn't leave card" }
                        : { loading: "Joining card", success: "Joined card", failure: "Couldn't join card" },
                      () => hackban.setMember(card.id, me, !joined),
                    );
                    if (ok) changed();
                  }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Link" content={card.url} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action.CopyToClipboard
                title="Copy Title"
                content={card.title}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <RefreshAction onRefresh={revalidate} />
              {card.archived ? (
                <Action
                  title="Restore Card"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    const ok = await withToast(
                      { loading: "Restoring card", success: "Card restored", failure: "Couldn't restore card" },
                      () => hackban.updateCard({ cardId: card.id, archived: false }),
                    );
                    if (ok) changed();
                  }}
                />
              ) : (
                <Action
                  title="Archive Card"
                  icon={Icon.Tray}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Archive this card?",
                      message: "You can restore it from the board's archive.",
                      primaryAction: { title: "Archive", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    const ok = await withToast(
                      { loading: "Archiving card", success: "Card archived", failure: "Couldn't archive card" },
                      () => hackban.updateCard({ cardId: card.id, archived: true }),
                    );
                    if (!ok) return;
                    onChange?.();
                    pop();
                  }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <ManageAccountsAction />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
