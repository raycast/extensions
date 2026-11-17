import { Action, ActionPanel, Alert, Color, Icon, Keyboard, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import type { ReactNode } from "react";
import {
  acceptTransfer,
  cancelTransfer,
  declineTransfer,
  pauseTransfer,
  removeTransfer,
  resumeTransfer,
} from "../lib/actions";
import { userMessage } from "../lib/client";
import type { TransferRow } from "../lib/model";
import { fileManagerName } from "../lib/selection";
import { primaryShortcut } from "../lib/shortcuts";
import { TransferDetail } from "./TransferDetail";

/** Runs a transfer action and reports it, e.g. "Transfer Paused" / "Couldn't Pause Transfer", naming the file. */
async function runTransferAction(row: TransferRow, done: string, failed: string, action: () => Promise<void>) {
  try {
    await action();
    await showToast({ style: Toast.Style.Success, title: done, message: row.title });
    return true;
  } catch (error) {
    await showFailureToast(error, { title: failed, message: `${row.title}: ${userMessage(error)}` });
    return false;
  }
}

/** A local file that exists and is complete: received files once finished, sent files while still on disk. */
export function openablePath(row: TransferRow) {
  if (row.incoming && !row.isFinishedOk) return undefined;
  return row.localPaths.find((path) => existsSync(path));
}

export function statusColor(row: TransferRow) {
  if (row.errorMessage) return Color.Red;
  if (row.needsResponse) return Color.Blue;
  if (row.isFinishedOk) return Color.Green;
  return undefined;
}

export function percent(row: TransferRow) {
  return row.fraction !== undefined ? `${Math.round(row.fraction * 100)}%` : undefined;
}

export function TransferActions({
  row,
  path,
  inDetail = false,
  onRemoved,
  extra,
}: {
  row: TransferRow;
  /** From openablePath(row), computed once by the caller. */
  path?: string;
  /** Inside the details screen, so "Show Details" and Quick Look are left out. */
  inDetail?: boolean;
  onRemoved?: () => void;
  extra?: ReactNode;
}) {
  const single = row.localPaths.length === 1;
  const name = `“${row.title}”`;
  const showDetails = !inDetail && (
    <Action.Push
      title="Show Details"
      icon={Icon.Sidebar}
      shortcut={primaryShortcut("i")}
      target={<TransferDetail id={row.id} />}
    />
  );
  // Always something harmless in the first section, so ↵ and ⌘↵ are never destructive.
  const copy = row.errorMessage ? (
    <Action.CopyToClipboard title="Copy Error" icon={Icon.CopyClipboard} content={row.errorMessage} />
  ) : (
    <Action.CopyToClipboard
      title="Copy Name"
      icon={Icon.CopyClipboard}
      content={row.title}
      shortcut={Keyboard.Shortcut.Common.CopyName}
    />
  );

  return (
    <ActionPanel>
      {row.needsResponse ? (
        <ActionPanel.Section>
          <Action
            title="Accept"
            icon={Icon.Check}
            onAction={() =>
              runTransferAction(row, "Transfer Accepted", "Couldn't Accept Transfer", () => acceptTransfer(row.id))
            }
          />
          {showDetails}
          {copy}
        </ActionPanel.Section>
      ) : (
        <ActionPanel.Section>
          {path && single && <Action.Open title="Open" icon={{ fileIcon: path }} target={path} />}
          {path && <Action.ShowInFinder title={`Show in ${fileManagerName}`} path={path} />}
          {showDetails}
          {path && !inDetail && <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />}
          {copy}
          {path && (
            <Action.CopyToClipboard
              title="Copy Path"
              icon={Icon.CopyClipboard}
              content={single ? path : dirname(path)}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {row.canPause && (
          <Action
            title="Pause"
            icon={Icon.Pause}
            shortcut={primaryShortcut("p", true)}
            onAction={() =>
              runTransferAction(row, "Transfer Paused", "Couldn't Pause Transfer", () => pauseTransfer(row.id))
            }
          />
        )}
        {row.canResume && (
          <Action
            title="Resume"
            icon={Icon.Play}
            shortcut={primaryShortcut("p", true)}
            onAction={() =>
              runTransferAction(row, "Transfer Resumed", "Couldn't Resume Transfer", () => resumeTransfer(row.id))
            }
          />
        )}
        {row.needsResponse && (
          <Action
            title="Decline"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={primaryShortcut("x", true)}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Decline Transfer?",
                message: `${row.peerName} will need to send ${name} again.`,
                primaryAction: { title: "Decline", style: Alert.ActionStyle.Destructive },
              });
              if (confirmed) {
                await runTransferAction(row, "Transfer Declined", "Couldn't Decline Transfer", () =>
                  declineTransfer(row.id),
                );
              }
            }}
          />
        )}
        {row.canCancel && !row.needsResponse && (
          <Action
            title="Cancel Transfer"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={primaryShortcut("x", true)}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Cancel Transfer?",
                message: `${name} won't finish ${row.incoming ? "downloading" : "sending"}.`,
                primaryAction: { title: "Cancel Transfer", style: Alert.ActionStyle.Destructive },
                dismissAction: { title: "Keep Going" },
              });
              if (confirmed) {
                await runTransferAction(row, "Transfer Canceled", "Couldn't Cancel Transfer", () =>
                  cancelTransfer(row.id),
                );
              }
            }}
          />
        )}
        {row.canRemove && (
          <Action
            title="Remove from History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Remove from History?",
                message: "Files already on disk are kept.",
                primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
              });
              if (!confirmed) return;
              const removed = await runTransferAction(row, "Removed from History", "Couldn't Remove Transfer", () =>
                removeTransfer(row.id, false),
              );
              if (removed) onRemoved?.();
            }}
          />
        )}
        {extra}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
