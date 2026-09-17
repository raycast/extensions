import { Action, ActionPanel, Alert, Icon, confirmAlert, Keyboard } from "@raycast/api";
import { errorMessage, runContainerMutation } from "../lib/container";
import { openExecInTerminal } from "../lib/terminal";
import { withToast } from "../lib/toast";
import type { ContainerVM } from "../lib/types";
import { ContainerLogs } from "./LogsView";

interface Messages {
  start: string;
  ok: string;
}

interface Props {
  container: ContainerVM;
  revalidate: () => void;
  /** Called after a destructive mutation completes (e.g. to pop a detail view). */
  onRemoved?: () => void;
}

/**
 * Shared lifecycle/utility actions for a container, used by both the list row
 * and the detail view. Render inside an `<ActionPanel>`.
 */
export function ContainerActions({ container, revalidate, onRemoved }: Props) {
  const run = async (args: string[], messages: Messages): Promise<boolean> => {
    const ok = await withToast({
      action: () => runContainerMutation(args),
      onStart: messages.start,
      onSuccess: messages.ok,
      onFailure: (error) => ({ title: "Action failed", message: errorMessage(error) }),
    })();
    revalidate();
    return ok;
  };

  const restart = () =>
    withToast({
      action: async () => {
        await runContainerMutation(["stop", container.id]);
        await runContainerMutation(["start", container.id]);
      },
      onStart: "Restarting…",
      onSuccess: "Container restarted",
      onFailure: (error) => ({ title: "Restart failed", message: errorMessage(error) }),
    })().then(() => revalidate());

  const confirmThenRun = async (title: string, actionLabel: string, args: string[], messages: Messages) => {
    const confirmed = await confirmAlert({
      title,
      icon: Icon.Trash,
      primaryAction: { title: actionLabel, style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      const ok = await run(args, messages);
      if (ok) {
        onRemoved?.();
      }
    }
  };

  return (
    <>
      <ActionPanel.Section>
        {container.isRunning ? (
          <Action
            title="Stop"
            icon={Icon.Stop}
            onAction={() => run(["stop", container.id], { start: "Stopping…", ok: "Container stopped" })}
          />
        ) : (
          <Action
            title="Start"
            icon={Icon.Play}
            onAction={() => run(["start", container.id], { start: "Starting…", ok: "Container started" })}
          />
        )}
        {container.isRunning && <Action title="Restart" icon={Icon.ArrowClockwise} onAction={restart} />}
        <Action.Push
          title="View Logs"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          target={<ContainerLogs id={container.id} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {container.isRunning && (
          <Action
            title="Open Shell in Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => openExecInTerminal(container.id)}
          />
        )}
        {container.isRunning && (
          <Action
            title="Kill"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={() =>
              confirmThenRun(`Kill container ${container.id}?`, "Kill", ["kill", container.id], {
                start: "Killing…",
                ok: "Container killed",
              })
            }
          />
        )}
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() =>
            confirmThenRun(`Delete container ${container.id}?`, "Delete", ["delete", container.id], {
              start: "Deleting…",
              ok: "Container deleted",
            })
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy ID" content={container.id} />
        {container.ip ? <Action.CopyToClipboard title="Copy IP Address" content={container.ip} /> : null}
        <Action.CopyToClipboard title="Copy Image Reference" content={container.image} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </>
  );
}
