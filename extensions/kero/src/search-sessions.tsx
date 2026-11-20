import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { NewSessionForm } from "./new-session";
import { InstallKeroAction } from "./components/install-kero-action";
import { useSessions } from "./hooks/use-sessions";
import { KeroError } from "./lib/kero";
import { KERO_ICONS } from "./lib/icons";
import { paneDirectoryLabel, shortenDirectory } from "./lib/directories";
import { matchesStatus, PaneItem, PaneStatus, StatusFilter } from "./lib/model";

const statuses: Record<PaneStatus, { label: string; color: Color }> = {
  working: { label: "Working", color: Color.Blue },
  waiting: { label: "Waiting", color: Color.Orange },
  idle: { label: "Idle", color: Color.SecondaryText },
  error: { label: "Error", color: Color.Red },
  exited: { label: "Exited", color: Color.SecondaryText },
  unknown: { label: "Unknown", color: Color.SecondaryText },
};

function keroIcon(source: string) {
  return { source, tintColor: Color.PrimaryText };
}

function CommonActions({ refresh, error }: { refresh: () => void; error?: Error }) {
  return (
    <ActionPanel.Section>
      <Action.Push
        title="New Kero Session"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<NewSessionForm isNested />}
      />
      <Action
        title="Refresh Sessions"
        icon={keroIcon(KERO_ICONS.refresh)}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <InstallKeroAction error={error} />
      <Action
        title="Open Extension Preferences"
        icon={keroIcon(KERO_ICONS.settings)}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}

export default function SearchSessions() {
  const { keroPath } = getPreferenceValues<{ keroPath?: string }>();
  const { client, groups, isLoading, error, hasSnapshot, refresh } = useSessions(keroPath);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const focusing = useRef(false);
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  const lastRefreshError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!error) {
      lastRefreshError.current = undefined;
      return;
    }
    if (!hasSnapshot || lastRefreshError.current === error.message) return;
    lastRefreshError.current = error.message;
    // Warn even when search filtering hides the warning row. Avoid repeating
    // the same toast on every polling failure or changing the root title.
    void showToast({
      style: Toast.Style.Failure,
      title: "Sessions May Be Outdated",
      message: error.message,
    }).catch(() => undefined);
  }, [error, hasSnapshot]);

  async function focus(item: PaneItem) {
    if (focusing.current) return;
    focusing.current = true;
    try {
      await client.focus(item.id);
    } catch (reason) {
      if (reason instanceof KeroError && reason.kind === "missing-target") refresh();
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open Kero Pane",
        message: reason instanceof Error ? reason.message : String(reason),
      });
      focusing.current = false;
      return;
    }
    try {
      // Do not hide Raycast until Kero has accepted the focus request.
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pane Opened, but Raycast Could Not Close",
        message: reason instanceof Error ? reason.message : String(reason),
      });
    } finally {
      focusing.current = false;
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects, sessions, directories, branches, or agents…"
      onSearchTextChange={setSearch}
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Pane Status"
          value={filter}
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Item title="Needs Attention" value="attention" />
          <List.Dropdown.Item title="Working" value="working" />
          <List.Dropdown.Item title="Idle" value="idle" />
          <List.Dropdown.Item title="Exited" value="exited" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : keroIcon(KERO_ICONS.terminal)}
        title={
          error
            ? "Could Not Load Kero Sessions"
            : isLoading
              ? "Loading Kero Sessions…"
              : total
                ? "No Matching Panes"
                : "No Kero Sessions"
        }
        description={
          error
            ? error.message
            : total
              ? "Try another search or status filter."
              : "Use New Kero Session to create a shell session."
        }
        actions={
          <ActionPanel>
            <CommonActions refresh={refresh} error={error} />
          </ActionPanel>
        }
      />
      {groups.map((group) => (
        <List.Section key={group.id} title={group.title} subtitle={shortenDirectory(group.subtitle)}>
          {group.items
            .filter((item) => matchesStatus(item.status, filter))
            .map((item) => {
              const status = statuses[item.status];
              const statusLabel =
                item.status === "working" && item.progress !== undefined
                  ? `${status.label} ${item.progress}%`
                  : status.label;
              const accessories: List.Item.Accessory[] = [];
              if (item.branch)
                accessories.push({
                  icon: keroIcon(KERO_ICONS.branch),
                  text: item.branch,
                  tooltip: `Branch: ${item.branch}`,
                });
              if (item.program) accessories.push({ text: item.program, tooltip: "Current Program" });
              accessories.push({
                tag: { value: statusLabel, color: status.color },
                tooltip: `Kero status: ${statusLabel}`,
              });
              return (
                <List.Item
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={paneDirectoryLabel(item.directory, group.subtitle)}
                  keywords={item.keywords}
                  icon={{
                    source: item.icon.source,
                    tintColor:
                      item.icon.tint === "primary"
                        ? Color.PrimaryText
                        : item.icon.tint === "secondary"
                          ? Color.SecondaryText
                          : item.icon.tint,
                  }}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action title="Open in Kero" icon={keroIcon(KERO_ICONS.open)} onAction={() => focus(item)} />
                      <ActionPanel.Section>
                        {item.directory && (
                          <Action.CopyToClipboard
                            title="Copy Working Directory"
                            icon={keroIcon(KERO_ICONS.copy)}
                            content={item.directory}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                        )}
                        <Action.CopyToClipboard
                          title="Copy Session ID"
                          icon={keroIcon(KERO_ICONS.copy)}
                          content={item.sessionId}
                        />
                        <Action.CopyToClipboard
                          title="Copy Pane ID"
                          icon={keroIcon(KERO_ICONS.copy)}
                          content={item.id}
                        />
                      </ActionPanel.Section>
                      <CommonActions refresh={refresh} error={error} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
      {error && hasSnapshot && total > 0 && !search && (
        <List.Section title="Connection Warning">
          <List.Item
            id="connection-warning"
            title="Sessions May Be Outdated"
            subtitle={error.message}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <CommonActions refresh={refresh} error={error} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
