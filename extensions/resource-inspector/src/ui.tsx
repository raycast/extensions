import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  bytes,
  entities,
  Entity,
  markdownText,
  pressureName,
  processKey,
  Snapshot,
} from "./model";
import { binary, getSnapshot } from "./runtime";
import { nativeCall } from "./native";
import { stopContainer } from "./containers";

export function useLive() {
  const [snapshot, setSnapshot] = useState<Snapshot>(),
    [previous, setPrevious] = useState<Snapshot>();
  const [error, setError] = useState<string>();
  const last = useRef<Snapshot | undefined>(undefined),
    busy = useRef(false),
    mounted = useRef(true);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await getSnapshot();
      if (mounted.current) {
        setPrevious(last.current);
        last.current = next;
        setSnapshot(next);
        setError(undefined);
      }
    } catch (e) {
      if (mounted.current) setError(String(e instanceof Error ? e.message : e));
    } finally {
      busy.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  return { snapshot, previous, error, refresh };
}
export function systemSummary(snapshot: Snapshot) {
  return `Pressure: ${pressureName(snapshot.system.pressure)} · Compressed: ${bytes(snapshot.system.compressed)} · Swap: ${bytes(snapshot.system.swapUsed)} · RAM: ${bytes(snapshot.system.totalMemory)}`;
}
export function cpu(value: number | null) {
  return value == null ? "Measuring…" : `${value.toFixed(1)}%`;
}
export function entityIcon(entity: Entity) {
  return entity.kind === "container"
    ? Icon.Box
    : entity.kind === "app"
      ? Icon.AppWindow
      : Icon.Gear;
}
export function ResourceRow({
  entity,
  snapshot,
}: {
  entity: Entity;
  snapshot: Snapshot;
}) {
  return (
    <List.Item
      id={entity.key}
      title={entity.name}
      icon={entityIcon(entity)}
      subtitle={
        entity.kind === "app"
          ? `${entity.processes.length} processes`
          : entity.target
            ? `PID ${entity.target.pid}${entity.target.appName ? ` · ${entity.target.appName}` : ""}`
            : "OrbStack"
      }
      accessories={[
        {
          text: bytes(entity.memory),
          tooltip:
            entity.kind === "container"
              ? "Container memory, separate from host usage"
              : "Physical memory footprint",
        },
        {
          text: `${entity.partialMetrics && entity.cpuPercent != null ? "≥ " : ""}${cpu(entity.cpuPercent)}`,
          tooltip: entity.partialMetrics
            ? "Observed CPU for measured processes; some counters are unavailable. 100% is one logical core."
            : "CPU: 100% is one logical core",
        },
        ...(entity.blockedReason
          ? [
              {
                icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
                tooltip: entity.blockedReason,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Inspect Details"
            icon={Icon.Eye}
            target={
              <ResourceDetail selected={entity} selectedSnapshot={snapshot} />
            }
          />
        </ActionPanel>
      }
    />
  );
}
function stillSame(selected: Entity, snapshot: Snapshot) {
  if (selected.container)
    return snapshot.containers.some(
      (c) =>
        c.id === selected.container!.id &&
        c.startedAt === selected.container!.startedAt,
    );
  if (!selected.target)
    return (
      selected.kind === "app" &&
      snapshot.processes.some(
        (p) => p.appPath && `app:${p.appPath}` === selected.key,
      )
    );
  return (
    snapshot.boot !== "unknown" &&
    snapshot.processes.some(
      (p) =>
        processKey(p, snapshot.boot) ===
          processKey(selected.target!, snapshot.boot) &&
        p.executable === selected.target!.executable,
    )
  );
}
export function ProcessList({ appKey }: { appKey: string }) {
  const live = useLive();
  const all = live.snapshot ? entities(live.snapshot, live.previous) : [];
  const group = all.find((e) => e.key === appKey),
    ids = new Set(group?.processes.map((p) => p.pid));
  return (
    <List
      isLoading={!live.snapshot && !live.error}
      navigationTitle="App Processes"
      searchBarPlaceholder="Choose one process to inspect"
    >
      <List.EmptyView
        title={live.error ?? "No remaining processes"}
        description="Processes are never stopped as a group."
      />
      {all
        .filter((e) => e.kind === "process" && ids.has(e.target!.pid))
        .sort((a, b) => (b.memory ?? -1) - (a.memory ?? -1))
        .map((e) => (
          <ResourceRow key={e.key} entity={e} snapshot={live.snapshot!} />
        ))}
    </List>
  );
}
export function ResourceDetail({
  selected,
  selectedSnapshot,
}: {
  selected: Entity;
  selectedSnapshot: Snapshot;
}) {
  const live = useLive(),
    { pop } = useNavigation();
  const [pending, setPending] = useState(false),
    [result, setResult] = useState<string>();
  const snap = live.snapshot ?? selectedSnapshot;
  const latest =
    entities(snap, live.previous).find((e) => e.key === selected.key) ??
    selected;
  const same = snap.boot === selectedSnapshot.boot && stillSame(selected, snap);
  const unavailable =
    live.error ||
    (selected.kind === "container" ? snap.containerError : undefined);
  const canAct =
    same &&
    !selected.blockedReason &&
    !latest.blockedReason &&
    !unavailable &&
    !!live.snapshot &&
    !pending;
  const title =
    selected.kind === "app"
      ? "Quit App"
      : selected.kind === "container"
        ? "Stop Container"
        : "Stop Process";
  async function act(force: boolean) {
    if (!canAct) return;
    const confirmed = await confirmAlert({
      title: `${force ? "Force " : ""}${selected.kind === "app" ? "Quit" : "Stop"} ${selected.name}?`,
      message: force
        ? "This immediately stops only the selected target. Unsaved work may be lost."
        : selected.kind === "app"
          ? "Request a normal quit. The app can show a save prompt or remain open. Other apps will not be closed."
          : selected.kind === "container"
            ? "Request a normal container shutdown. Services using it may be interrupted. It will never be force-stopped automatically."
            : `Send a termination request to PID ${selected.target?.pid}. Work in this process may be interrupted. Its children will not be stopped automatically.`,
      primaryAction: {
        title: force ? "Force Stop" : title,
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    setPending(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Requesting ${selected.name} to stop`,
    });
    try {
      let status: string;
      if (selected.container)
        status = await stopContainer(selected.container, force);
      else {
        const p = selected.target!;
        status = (
          await nativeCall<{ status: string }>(binary, "action", {
            pid: p.pid,
            start: p.start,
            boot: selectedSnapshot.boot,
            executable: p.executable,
            action:
              selected.kind === "app"
                ? force
                  ? "force-app"
                  : "quit-app"
                : force
                  ? "force-process"
                  : "stop-process",
          })
        ).status;
      }
      setResult(
        status === "exited"
          ? "The selected target exited."
          : status === "rejected"
            ? "The app declined the quit request. Check it for a save prompt."
            : "Shutdown requested. Waiting for the target to exit; no automatic force quit.",
      );
      toast.style = Toast.Style.Success;
      toast.title =
        status === "exited" ? "Target exited" : "Shutdown request sent";
      await live.refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not stop target";
      toast.message = String(e instanceof Error ? e.message : e);
      setResult(toast.message);
    } finally {
      setPending(false);
    }
  }
  const memoryChange =
    selected.memory != null && latest.memory != null && same
      ? `\n\nMemory change while viewing: ${latest.memory >= selected.memory ? "+" : "−"}${bytes(Math.abs(latest.memory - selected.memory))}. This is an observation, not an estimate of reclaimable RAM.`
      : "";
  const markdown =
    `# ${markdownText(selected.name)}\n\n${selected.kind === "app" ? "Application and associated processes" : selected.kind === "container" ? "Local OrbStack container" : "Individual process"}\n\n` +
    (unavailable
      ? `**Measurements unavailable:** ${markdownText(unavailable)}\n\n`
      : "") +
    (!same && !unavailable
      ? "**The original target has exited or restarted.** Return to the list to select a current target.\n\n"
      : "") +
    (result ? `${markdownText(result)}\n\n` : "") +
    `| Measurement | Current |\n|---|---|\n| Memory | ${bytes(same ? latest.memory : null)} |\n| CPU | ${same ? cpu(latest.cpuPercent) : "—"} |\n| Disk read since previous sample | ${bytes(same ? latest.readDelta : null)} |\n| Disk written since previous sample | ${bytes(same ? latest.writeDelta : null)} |\n\n` +
    `${systemSummary(snap)}\n\nCPU uses 100% per logical core. Missing measurements are shown as unavailable.\n\n` +
    (latest.partialMetrics
      ? "**Partial CPU and disk totals:** only processes with comparable counters are included. The measured totals can be lower than the app's actual usage.\n\n"
      : "") +
    (selected.target
      ? `PID: ${selected.target.pid} · Owner UID: ${selected.target.uid}\n\nExecutable: ${markdownText(selected.target.executable)}\n\n`
      : "") +
    (selected.container
      ? `Container ID: ${selected.container.id}\n\nContainer memory overlaps OrbStack's host allocation. Stopping it may free much less host RAM than OrbStack's total.\n\n`
      : "") +
    (latest.blockedReason || selected.blockedReason
      ? `**Read-only:** ${markdownText(latest.blockedReason ?? selected.blockedReason!)}\n\n`
      : "") +
    (selected.kind === "app"
      ? "Quitting requests that this application close normally. Surviving background processes remain available for individual inspection.\n\n"
      : "") +
    "No other app, process, or container is selected." +
    memoryChange;
  return (
    <Detail
      isLoading={pending || (!live.snapshot && !live.error)}
      markdown={markdown}
      actions={
        <ActionPanel>
          {selected.kind === "app" && (
            <Action.Push
              title="Inspect App Processes"
              icon={Icon.List}
              target={<ProcessList appKey={selected.key} />}
            />
          )}
          <Action
            title="Refresh Measurements"
            icon={Icon.ArrowClockwise}
            onAction={live.refresh}
          />
          {canAct && (
            <ActionPanel.Section title="Only This Target">
              <Action
                title={`${title}: ${selected.name}`}
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => act(false)}
              />
              <Action
                title={`${selected.kind === "app" ? "Force Quit" : "Force Stop"}: ${selected.name}`}
                icon={Icon.ExclamationMark}
                style={Action.Style.Destructive}
                onAction={() => act(true)}
              />
            </ActionPanel.Section>
          )}
          <Action
            title="Back to Results"
            icon={Icon.ArrowLeft}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}
