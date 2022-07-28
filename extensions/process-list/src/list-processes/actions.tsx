import { Action, ActionPanel, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import fkill from "fkill";
import { FC, useCallback } from "react";
import { ProcessItem } from "../types";
import { useProcessListContext } from "./context";

export const Actions: FC<{ processItem: ProcessItem }> = ({ processItem }) => {
  const { toggleDetail, showDetail, refresh } = useProcessListContext();

  const quit = useCallback(
    async (force = false) => {
      const pid = parseInt(processItem.pid, 10);
      if (Number.isNaN(pid)) return;

      if (
        await confirmAlert({
          title: `Are you sure you want to ${force ? "kill" : "quit"} ${processItem.name}?`,
        })
      ) {
        try {
          const toast = await showToast({
            title: "Killing process...",
            style: Toast.Style.Animated,
          });
          await fkill(pid, { force, silent: true });
          refresh();
          toast.title = "Success";
          toast.message = `Killed process ${processItem.name}`;
          toast.style = Toast.Style.Success;
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Could not kill process",
          });
        }
      }
    },
    [processItem]
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={showDetail ? "Hide details" : "View details"}
          onAction={() => toggleDetail()}
          icon={showDetail ? Icon.EyeDisabled : Icon.Info}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard content={processItem.pid} title="Copy PID to clipboard" />
      <Action.CopyToClipboard content={processItem.path} title="Copy path to clipboard" icon={Icon.Folder} />
      <Action.ShowInFinder path={processItem.path} title="Reveal in Finder" />
      <ActionPanel.Section>
        <Action title="Quit" onAction={() => quit()} icon={Icon.Multiply} shortcut={{ key: "q", modifiers: [] }} />
        <Action
          title="Force Quit"
          onAction={() => quit(true)}
          icon={Icon.Warning}
          shortcut={{ key: "q", modifiers: ["cmd"] }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
