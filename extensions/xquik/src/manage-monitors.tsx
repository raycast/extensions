import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CreateMonitorForm } from "./components/create-monitor-form";
import { ErrorView } from "./components/error-view";
import { EventList } from "./components/event-list";
import { showErrorToast } from "./lib/error-toast";
import { eventLabel, eventTypeSummary } from "./lib/events";
import {
  deleteMonitor,
  fetchMonitorPage,
  MONITOR_KINDS,
  MonitorKind,
  monitorTarget,
  setMonitorActive,
} from "./lib/monitors";
import { Monitor } from "./lib/schemas";

const KINDS = Object.keys(MONITOR_KINDS) as MonitorKind[];

const loadMonitorPage =
  (kind: MonitorKind) =>
  async ({ cursor }: { cursor?: string }) => {
    const { monitors, nextCursor } = await fetchMonitorPage(kind, cursor);
    return { data: monitors, hasMore: nextCursor !== undefined, cursor: nextCursor };
  };

type MonitorRowProps = {
  kind: MonitorKind;
  monitor: Monitor;
  onChanged: () => void;
};

function MonitorRow({ kind, monitor, onChanged }: MonitorRowProps) {
  const { id, isActive, name } = monitor;
  const target = monitorTarget(monitor);

  async function toggle() {
    const title = isActive ? "Pausing Monitor" : "Resuming Monitor";
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await setMonitorActive(kind, id, !isActive);
      toast.style = Toast.Style.Success;
      toast.title = isActive ? "Monitor Paused" : "Monitor Resumed";
      onChanged();
    } catch (error) {
      await toast.hide();
      await showErrorToast(error as Error, toggle);
    }
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete Monitor",
      message: `This stops ${target} and removes its stored events.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Monitor" });
    try {
      await deleteMonitor(kind, id);
      toast.style = Toast.Style.Success;
      toast.title = "Monitor Deleted";
      onChanged();
    } catch (error) {
      await toast.hide();
      await showErrorToast(error as Error, remove);
    }
  }

  return (
    <List.Item
      title={name ?? target}
      subtitle={name ? target : undefined}
      icon={isActive ? Icon.Bell : Icon.BellDisabled}
      accessories={[
        { text: eventTypeSummary(monitor.eventTypes), tooltip: monitor.eventTypes.map(eventLabel).join(", ") },
        isActive
          ? { tag: { value: "Active", color: Color.Green } }
          : { tag: { value: "Paused", color: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Events"
            icon={Icon.List}
            target={<EventList filter={MONITOR_KINDS[kind].eventFilter(id)} navigationTitle={target} />}
          />
          <Action title={isActive ? "Pause" : "Resume"} icon={isActive ? Icon.Pause : Icon.Play} onAction={toggle} />
          <CreateMonitorAction kind={kind} onCreated={onChanged} />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
        </ActionPanel>
      }
    />
  );
}

function CreateMonitorAction({ kind, onCreated }: { kind: MonitorKind; onCreated: () => void }) {
  return (
    <Action.Push
      title="Create Monitor"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateMonitorForm kind={kind} onCreated={onCreated} />}
    />
  );
}

export default function Command() {
  const [kind, setKind] = useState<MonitorKind>("account");
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(loadMonitorPage, [kind], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  const isWaiting = isLoading || (!data && !error);

  function emptyView() {
    if (isWaiting) return null;
    if (error) return <ErrorView error={error} onRetry={revalidate} />;
    return (
      <List.EmptyView
        icon={Icon.Bell}
        title="No Monitors Yet"
        description="Create a monitor to get events from X."
        actions={
          <ActionPanel>
            <CreateMonitorAction kind={kind} onCreated={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isWaiting}
      pagination={pagination}
      searchBarPlaceholder="Filter Monitors"
      searchBarAccessory={
        <List.Dropdown tooltip="Monitor Kind" value={kind} onChange={(value) => setKind(value as MonitorKind)}>
          {KINDS.map((option) => (
            <List.Dropdown.Item key={option} title={MONITOR_KINDS[option].title} value={option} />
          ))}
        </List.Dropdown>
      }
    >
      {emptyView()}
      {data?.map((monitor) => (
        <MonitorRow key={monitor.id} kind={kind} monitor={monitor} onChanged={revalidate} />
      ))}
    </List>
  );
}
