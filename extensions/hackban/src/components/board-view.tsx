import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import type { Account } from "../lib/accounts";
import { cardIcon, dueAccessory, labelAccessories } from "../lib/format";
import { type BoardCard, fetchBoard } from "../lib/hackban";
import { ManageAccountsAction } from "./accounts";
import { MoveCardSubmenu, RefreshAction, ToggleCompleteAction } from "./actions";
import { CardActions } from "./card-actions";
import { CreateCardForm } from "./create-card-form";

export function BoardActions({
  account,
  board,
  onRefresh,
  inBoard = false,
}: {
  account: Account;
  board: { id: string; name: string; url: string };
  onRefresh?: () => void;
  inBoard?: boolean;
}) {
  return (
    <ActionPanel title={board.name}>
      <ActionPanel.Section>
        {!inBoard && (
          <Action.Push
            title="Show Board"
            icon={Icon.AppWindowList}
            target={<BoardView account={account} boardId={board.id} name={board.name} />}
          />
        )}
        <Action.OpenInBrowser url={board.url} />
        <Action.Push
          title="Create Card"
          icon={Icon.NewDocument}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<CreateCardForm board={{ account, boardId: board.id }} onCreated={onRefresh} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Link" content={board.url} shortcut={Keyboard.Shortcut.Common.Copy} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onRefresh && <RefreshAction onRefresh={onRefresh} />}
        <ManageAccountsAction onChange={onRefresh} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function cardAccessories(c: BoardCard): List.Item.Accessory[] {
  return [
    ...labelAccessories(c.labels),
    ...(c.checklist ? [{ icon: Icon.CheckList, text: c.checklist, tooltip: "Checklist" }] : []),
    ...(c.comments ? [{ icon: Icon.Bubble, text: String(c.comments), tooltip: "Comments" }] : []),
    ...(c.members?.length
      ? [{ icon: Icon.Person, text: String(c.members.length), tooltip: c.members.join(", ") }]
      : []),
    ...dueAccessory(c.due, c.dueComplete),
  ];
}

export function BoardView({ account, boardId, name }: { account: Account; boardId: string; name: string }) {
  const [listId, setListId] = useState("");
  const { data: board, isLoading, revalidate } = useCachedPromise(fetchBoard, [account, boardId]);
  const lists = board?.lists ?? [];
  const shown = listId ? lists.filter((l) => l.id === listId) : lists;
  const title = board?.name ?? name;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchBarPlaceholder={`Filter cards on ${title}`}
      searchBarAccessory={
        <List.Dropdown tooltip="List" onChange={setListId}>
          <List.Dropdown.Item title="All Lists" value="" />
          {lists.map((l) => (
            <List.Dropdown.Item key={l.id} title={l.name} value={l.id} />
          ))}
        </List.Dropdown>
      }
      actions={board && <BoardActions account={account} board={board} onRefresh={revalidate} inBoard />}
    >
      <List.EmptyView icon={Icon.AppWindowList} title="No cards" description="This board has no open cards yet." />
      {shown.map((l) => (
        <List.Section key={l.id} title={l.name} subtitle={String(l.cards.length)}>
          {l.cards.map((c) => (
            <List.Item
              key={c.id}
              title={c.title}
              keywords={[...(c.labels ?? []), ...(c.members ?? [])]}
              icon={cardIcon(c.due, c.dueComplete)}
              accessories={cardAccessories(c)}
              actions={
                // get_board leaves card URLs out; they're always /c/<id>.
                <CardActions
                  account={account}
                  card={{ ...c, url: `${account.server}/c/${c.id}` }}
                  onChange={revalidate}
                >
                  <ToggleCompleteAction
                    account={account}
                    cardId={c.id}
                    complete={!!c.dueComplete}
                    onChange={revalidate}
                  />
                  <MoveCardSubmenu
                    account={account}
                    cardId={c.id}
                    boardId={boardId}
                    listId={l.id}
                    lists={lists}
                    onMoved={revalidate}
                  />
                  <Action.Push
                    title={`Create Card in ${l.name}`}
                    icon={Icon.NewDocument}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<CreateCardForm board={{ account, boardId, listId: l.id }} onCreated={revalidate} />}
                  />
                </CardActions>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
