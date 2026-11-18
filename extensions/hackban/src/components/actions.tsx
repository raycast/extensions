import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import type { Account } from "../lib/accounts";
import { api, type BoardList, fetchBoard } from "../lib/hackban";

/** Runs a change with a progress toast; resolves false (after a failure toast) if it threw. */
export async function withToast(
  text: { loading: string; success: string; failure: string },
  fn: () => Promise<unknown>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: text.loading });
  try {
    await fn();
    toast.style = Toast.Style.Success;
    toast.title = text.success;
    return true;
  } catch (e) {
    await showFailureToast(e, { title: text.failure });
    return false;
  }
}

export function ToggleCompleteAction({
  account,
  cardId,
  complete,
  onChange,
}: {
  account: Account;
  cardId: string;
  complete: boolean;
  onChange: (complete: boolean) => void | Promise<unknown>;
}) {
  return (
    <Action
      title={complete ? "Mark Incomplete" : "Mark Complete"}
      icon={complete ? Icon.Circle : Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() =>
        withToast(
          complete
            ? { loading: "Marking incomplete", success: "Marked incomplete", failure: "Couldn't update card" }
            : { loading: "Marking complete", success: "Marked complete", failure: "Couldn't update card" },
          async () => {
            await api(account).updateCard({ cardId, dueComplete: !complete });
            await onChange(!complete);
          },
        )
      }
    />
  );
}

/** Lists for a "move" submenu. Pass `lists` when the board is already loaded; otherwise they load on open. */
export function MoveCardSubmenu({
  account,
  cardId,
  boardId,
  listId,
  lists,
  onMoved,
}: {
  account: Account;
  cardId: string;
  boardId: string;
  listId: string;
  lists?: BoardList[];
  onMoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: board, isLoading } = useCachedPromise(fetchBoard, [account, boardId], { execute: open && !lists });
  return (
    <ActionPanel.Submenu
      title="Move to List"
      icon={Icon.ArrowRight}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      isLoading={isLoading}
      onOpen={() => setOpen(true)}
    >
      {(lists ?? board?.lists ?? [])
        .filter((l) => l.id !== listId)
        .map((l) => (
          <Action
            key={l.id}
            title={l.name}
            onAction={async () => {
              const moved = await withToast(
                { loading: "Moving card", success: `Moved to ${l.name}`, failure: "Couldn't move card" },
                () => api(account).moveCard(cardId, l.id),
              );
              if (moved) onMoved();
            }}
          />
        ))}
    </ActionPanel.Submenu>
  );
}

export function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
