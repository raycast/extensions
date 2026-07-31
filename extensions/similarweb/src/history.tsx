import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { formatWebsiteMarkdown, getHistoryAccessoryText } from "./lib/format";
import { clearHistory, deleteSnapshot, loadHistory } from "./lib/history";
import type { WebsiteSnapshot } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<WebsiteSnapshot[]>([]);
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const history = await loadHistory();

      if (!cancelled) {
        setSnapshots(history);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail} searchBarPlaceholder="Search website history">
      {snapshots.map((snapshot) => (
        <List.Item
          key={snapshot.domain}
          icon={Icon.Clock}
          title={snapshot.domain}
          accessories={showingDetail ? undefined : buildAccessories(snapshot)}
          detail={<List.Item.Detail markdown={formatWebsiteMarkdown(snapshot)} />}
          actions={
            <ActionPanel>
              <Action
                title={showingDetail ? "Hide Details" : "Show Details"}
                icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => setShowingDetail((v) => !v)}
              />
              <Action
                title="Open Live Lookup"
                icon={Icon.Globe}
                onAction={() =>
                  void launchCommand({
                    name: "show-website-data",
                    type: LaunchType.UserInitiated,
                    arguments: { domain: snapshot.domain },
                  })
                }
              />
              <Action.OpenInBrowser
                title="Open Website"
                url={`https://${snapshot.domain}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action.CopyToClipboard
                title="Copy Stored JSON"
                content={JSON.stringify(snapshot.data, null, 2)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Delete Snapshot"
                icon={Icon.Trash}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => void handleDeleteSnapshot(snapshot, setSnapshots)}
              />
              <Action
                title="Clear All History"
                icon={Icon.XMarkCircle}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={() => void handleClearHistory(setSnapshots)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Clock}
        title="No Stored Website History"
        description="Run Show Website Data to create your first snapshot."
        actions={
          <ActionPanel>
            <Action
              title="Open Live Lookup"
              icon={Icon.Globe}
              onAction={() =>
                void launchCommand({
                  name: "show-website-data",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function handleDeleteSnapshot(
  snapshot: WebsiteSnapshot,
  setSnapshots: Dispatch<SetStateAction<WebsiteSnapshot[]>>,
): Promise<void> {
  const confirmed = await confirmAlert({
    title: `Delete snapshot for ${snapshot.domain}?`,
    message: "This removes only the selected stored snapshot.",
    primaryAction: {
      title: "Delete Snapshot",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  const nextSnapshots = await deleteSnapshot(snapshot.domain);
  setSnapshots(nextSnapshots);
  await showToast({ style: Toast.Style.Success, title: "Snapshot deleted" });
}

async function handleClearHistory(setSnapshots: Dispatch<SetStateAction<WebsiteSnapshot[]>>): Promise<void> {
  const confirmed = await confirmAlert({
    title: "Clear all website history?",
    message: "This removes every stored website snapshot.",
    primaryAction: {
      title: "Clear History",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  await clearHistory();
  setSnapshots([]);
  await showToast({ style: Toast.Style.Success, title: "History cleared" });
}

function buildAccessories(snapshot: WebsiteSnapshot): List.Item.Accessory[] {
  const summaryAccessories = getHistoryAccessoryText(snapshot).map((accessory) => ({
    text: accessory.value,
    tooltip: accessory.label,
  }));

  return [
    ...summaryAccessories,
    {
      text: snapshot.source === "active-tab" ? "Active Tab" : "Argument",
      tooltip: "Lookup source",
    },
  ];
}
