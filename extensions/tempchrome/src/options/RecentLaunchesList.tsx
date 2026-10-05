import { Action, ActionPanel, Clipboard, Icon, List, popToRoot, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type JSX, useEffect, useState } from "react";

import { launchWithValues } from "../launch";
import { getPreferences } from "../preferences";
import LaunchOptionsForm from "./LaunchOptionsForm";
import { clearRecent, loadRecent, removeRecent } from "./recentLaunches";
import { buildExtraArgs, type LaunchOptionsValues } from "./schema";
import { summarizeValues } from "./summarizeValues";

export default function RecentLaunchesList(): JSX.Element {
  const [entries, setEntries] = useState<LaunchOptionsValues[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRecent().then((result) => {
      if (!cancelled) setEntries(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLaunch(entry: LaunchOptionsValues): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Launching…",
    });
    const launched = await launchWithValues(entry);
    if (launched) {
      toast.hide();
      await popToRoot({ clearSearchBar: true });
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Launch failed";
    }
  }

  async function handleClear(): Promise<void> {
    const count = entries?.length ?? 0;
    if (count === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to clear",
      });
      return;
    }
    await clearRecent();
    setEntries([]);
    await showToast({
      style: Toast.Style.Success,
      title: `Cleared ${count} recent launch${count === 1 ? "" : "es"}`,
    });
  }

  async function handleRemove(index: number): Promise<void> {
    try {
      const next = await removeRecent(index);
      setEntries(next);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed recent entry",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Remove failed" });
    }
  }

  async function handleCopyCommand(entry: LaunchOptionsValues): Promise<void> {
    const preferences = getPreferences();
    const args = [`--user-data-dir=${preferences.tempBaseDir}/<id>`, ...buildExtraArgs(entry)];
    const command = [shellQuote(preferences.binaryPath), ...args.map(shellQuote)].join(" ");
    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Chromium command",
      message: `${args.length} argument${args.length === 1 ? "" : "s"}`,
    });
  }

  return (
    <List isLoading={entries === null} navigationTitle="Recent Launches" searchBarPlaceholder="Filter recent launches">
      {entries !== null && entries.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent launches"
          description="Launch with options once and it will appear here."
        />
      )}
      {entries?.map((entry, index) => (
        <List.Item
          key={index}
          icon={Icon.Clock}
          title={summarizeValues(entry)}
          accessories={[{ text: `#${index + 1}` }]}
          actions={
            <ActionPanel>
              <Action title="Launch" icon={Icon.Rocket} onAction={() => handleLaunch(entry)} />
              <Action.Push
                title="Edit in Form…"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<LaunchOptionsForm initialValues={entry} />}
              />
              <Action
                title="Copy Chromium Command"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() => handleCopyCommand(entry)}
              />
              <Action
                title="Remove This Entry"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleRemove(index)}
              />
              <Action
                title="Clear All Recent"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                onAction={handleClear}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_\-./=:,@%+]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
