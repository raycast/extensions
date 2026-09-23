import { Action, ActionPanel, Color, environment, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { groupByApp } from "./analysis/apps";
import { chargingExplanation } from "./analysis/battery";
import { drainRate } from "./analysis/drain";
import { level } from "./analysis/level";
import { detectRunaways, Runaway } from "./analysis/runaway";
import { cpuSeverity, wattSeverity } from "./analysis/severity";
import { startedBy } from "./analysis/started-by";
import { processKind } from "./actions/process";
import { visibleRows } from "./analysis/visible";
import { nextPollDelay, timeWeightedAverage } from "./analysis/stats";
import { collectSnapshot, mergeSnapshot } from "./collectors/snapshot";
import { AppItem } from "./components/app-item";
import { ProcessActions } from "./components/process-actions";
import { raycastStorage } from "./history/raycast-storage";
import { loadHistory } from "./history/store";
import { chartMarkdown } from "./render/chart-markdown";
import { ChartPoint, chartSvg, DETAIL_CHART_HEIGHT } from "./render/chart-svg";
import {
  displayName,
  ENERGY_TOOLTIP,
  formatClock,
  formatDuration,
  formatUsage,
  formatRate,
  formatWatts,
} from "./render/format";
import {
  appendReading,
  chartFrame,
  nowBatteryParts,
  nowDetail,
  processCpuSeries,
  sourceWarning,
} from "./render/summary";
import { CHARGE_ICON, LEVEL_COLOR, SEVERITY_COLOR } from "./render/tint";
import { thresholds } from "./preferences";
import { Sample, Snapshot } from "./types";

// Polls start every 5 s. Most only read power (ioreg, pmset, SMC: a few milliseconds); every third also
// runs top and ps. A full collection every 5 s kept an Intel MacBook's CPU busy enough to add about 2 W,
// measured with SMC on 2026-09-23, so the view was raising the draw it shows.
const POLL_MS = 5000;
const PROCESS_POLL_EVERY = 3;
const HISTORY_RELOAD_MS = 60_000; // the menu bar appends a sample every two minutes, and on each menu open
// 15 minutes of live readings every 5 s; without SMC one per telemetry refresh (about a minute).
const LIVE_POINTS = 180;
// Only problems are spelled out; green already says all is well, and the words also help if colors are hard to tell apart.
const LEVEL_TEXT = { normal: "", high: " (sustained high draw)", runaway: " (runaway process found)" } as const;

export default function Command() {
  const [history, setHistory] = useState<Sample[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [live, setLive] = useState<ChartPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string>();

  // A quiet refresh follows an action whose own toast must stay visible (e.g. "Process is still running").
  const quietRefresh = useRef(false);
  const refresh = useCallback((quiet?: boolean) => {
    quietRefresh.current = quiet === true;
    setRefreshing(true);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const load = () =>
      loadHistory(raycastStorage, Date.now()).then(
        (h) => {
          setHistory(h);
          setHistoryError(undefined);
        },
        (e) => {
          setHistory([]);
          setHistoryError(`history: ${e instanceof Error ? e.message : String(e)}`);
        },
      );
    load();
    const interval = setInterval(load, HISTORY_RELOAD_MS);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    // A local flag per effect run: after a refresh, the previous loop's in-flight poll must
    // not reschedule itself, or two loops would run side by side.
    let cancelled = false;
    let count = 0;
    let timer: NodeJS.Timeout | undefined;
    const poll = async () => {
      const started = Date.now();
      // The first poll of each run is full, so a refresh also updates processes and sleep blockers.
      const first = count === 0;
      const processes = count % PROCESS_POLL_EVERY === 0;
      count++;
      const s = await collectSnapshot(undefined, undefined, { processes }).catch(() => undefined);
      if (cancelled) return;
      if (first && tick > 0 && quietRefresh.current) {
        quietRefresh.current = false;
        setRefreshing(false);
      } else if (first && tick > 0) {
        setRefreshing(false);
        showToast({
          style: Toast.Style.Success,
          title: "Refreshed",
          // Without SMC, watts barely move between refreshes (macOS updates them once a minute).
          message: s?.battery.systemLoadLive ? undefined : "System watts update about once a minute",
        });
      }
      if (s) {
        setSnapshot((prev) => mergeSnapshot(prev, s));
        const w = s.battery.systemLoadW;
        // Key each reading by when it was measured: live SMC readings each add a point, while ioreg's
        // repeat until macOS refreshes them, and repeats add none.
        const t = s.battery.updatedAt ?? s.t;
        if (w !== undefined) setLive((prev) => appendReading(prev, { t, w }, LIVE_POINTS));
      }
      timer = setTimeout(poll, nextPollDelay(Date.now() - started, POLL_MS));
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tick]);

  const th = thresholds();
  const runaways: Runaway[] = snapshot ? detectRunaways(history, snapshot, th) : [];
  const runawayByPid = new Map(runaways.map((r) => [r.pid, r]));

  const historyPoints: ChartPoint[] = history.flatMap((h) =>
    h.systemW === undefined ? [] : [{ t: h.t, w: h.systemW }],
  );
  const firstLive = live[0]?.t ?? Infinity;
  const points = [...historyPoints.filter((p) => p.t < firstLive), ...live];
  const watts = points.map((p) => p.w);
  const avg = timeWeightedAverage(points);
  const peak = watts.length ? Math.max(...watts) : undefined;

  const b = snapshot?.battery;
  const hasBattery = b?.percent !== undefined;
  // Charts are drawn as of the last full poll (see chartFrame), their color from the last point drawn.
  const chartAt = snapshot?.processesAt;
  // When the process list (and its ps details) was collected: actions re-check pids against it.
  const seenAt = snapshot?.processesAt ?? snapshot?.t ?? 0;
  const nowPoints = chartFrame(points, chartAt);
  const nowTone = wattSeverity(nowPoints[nowPoints.length - 1]?.w, runaways.length > 0, th);
  const nowMarkdown = chartMarkdown(
    chartSvg(nowPoints, environment.appearance, { tone: nowTone, height: DETAIL_CHART_HEIGHT }),
  );
  const parts = b ? nowBatteryParts(b, snapshot?.source) : undefined;
  const nowRows = nowDetail(
    {
      average: avg,
      peak,
      adapter: b?.adapterInputW,
      drain: snapshot?.source?.source === "battery" ? formatRate(drainRate(history)) : undefined,
    },
    b ?? {},
  );
  const nowAccessories: List.Item.Accessory[] = [];
  if (b && parts) {
    if (parts.adapter) {
      nowAccessories.push({
        icon: { source: Icon.Plug, tintColor: Color.SecondaryText },
        text: parts.adapter,
        tooltip: parts.adapterIsRating
          ? `${parts.adapter} negotiated with the charger (the most this Mac can take from it, not a live reading)`
          : `${parts.adapter} from the power adapter`,
      });
    }
    // A plain battery means on battery, a charging battery means plugged in: no words needed.
    nowAccessories.push({
      icon: { source: parts.pluggedIn ? Icon.BatteryCharging : Icon.Battery, tintColor: Color.SecondaryText },
      text: parts.percent,
      tooltip: parts.pluggedIn ? "On power adapter" : "On battery",
    });
    if (parts.status) {
      nowAccessories.push({
        icon: CHARGE_ICON[parts.status.state],
        text: parts.status.text,
        tooltip:
          parts.status.state === "on-battery" ? `${parts.status.text} left` : chargingExplanation(b, snapshot?.source),
      });
    }
  }
  const nowLevel = snapshot ? level(history, snapshot, runaways, th) : "normal";
  // A clock time, not "Ns ago": the view redraws every 5 s, so a relative age would sit still and mislead.
  const updated = b?.updatedAt !== undefined ? formatClock(b.updatedAt) : undefined;

  const allErrors = [...(snapshot?.errors ?? []), ...(historyError ? [historyError] : [])];
  const warning = sourceWarning(allErrors);
  const ioregFailed = snapshot?.errors.some((e) => e.startsWith("ioreg")) ?? false;

  // A desktop Mac has no battery and no power telemetry: hide Now, keep Apps, Processes and Sleep Blockers.
  // A failed ioreg call keeps Now so the warning above it explains the gap.
  const showNow = b?.systemLoadW !== undefined || hasBattery || ioregFailed;

  return (
    <List
      isShowingDetail
      isLoading={!snapshot || refreshing}
      // Shown in the window's footer, so the data age stays visible whichever row is selected.
      navigationTitle={updated ? `Diagnose Battery Drain · updated at ${updated}` : "Diagnose Battery Drain"}
    >
      {warning && (
        <List.Section title="Warning">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            title={warning}
            subtitle="Shown data may be incomplete; retrying every few seconds"
            detail={<List.Item.Detail markdown={allErrors.map((e) => `- \`${e}\``).join("\n")} />}
          />
        </List.Section>
      )}
      {showNow && (
        <List.Section title="Now">
          <List.Item
            // The system draw leads the row; its chip icon matches the menu bar and carries the level color.
            icon={{
              value: { source: Icon.ComputerChip, tintColor: LEVEL_COLOR[nowLevel] },
              tooltip: `System draw: what the whole Mac uses now, whether from the battery or the adapter${b?.systemLoadEstimated ? " (estimated from the battery)" : ""}${LEVEL_TEXT[nowLevel]}`,
            }}
            title={formatWatts(b?.systemLoadW)}
            accessories={nowAccessories}
            detail={
              // The chart is the markdown; the readings are native labels under it (see nowDetail).
              <List.Item.Detail
                markdown={nowMarkdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    {nowRows.power.map((r) => (
                      <List.Item.Detail.Metadata.Label key={r.title} title={r.title} text={r.text} />
                    ))}
                    {nowRows.battery.length > 0 && <List.Item.Detail.Metadata.Separator />}
                    {nowRows.battery.map((r) => (
                      <List.Item.Detail.Metadata.Label key={r.title} title={r.title} text={r.text} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => refresh()}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Apps">
        {snapshot &&
          visibleRows(groupByApp(snapshot.processes, snapshot.processInfo)).map((app) => (
            <AppItem key={app.name} app={app} snapshot={snapshot} history={history} onRefresh={refresh} />
          ))}
      </List.Section>

      <List.Section title="Processes">
        {snapshot &&
          visibleRows(
            snapshot.processes.filter((p) => p.pid > 0),
            new Set(runawayByPid.keys()),
          ).map((p) => {
            const r = runawayByPid.get(p.pid);
            const info = snapshot.processInfo.get(p.pid);
            const accessories: List.Item.Accessory[] = [{ text: formatUsage(p), tooltip: ENERGY_TOOLTIP }];
            if (r) accessories.unshift({ tag: { value: `Runaway ${formatDuration(r.sinceSec)}`, color: Color.Red } });
            else if (p.energy >= th.highEnergy) accessories.unshift({ tag: { value: "High", color: Color.Orange } });
            const cpuChart = chartMarkdown(
              chartSvg(processCpuSeries(history, p, chartAt ?? snapshot.t), environment.appearance, {
                unit: "%",
                height: DETAIL_CHART_HEIGHT,
                tone: cpuSeverity(p.cpu, Boolean(r)),
              }),
            );
            return (
              <List.Item
                key={p.pid}
                icon={{
                  source: r ? Icon.Warning : Icon.Gear,
                  tintColor: SEVERITY_COLOR[cpuSeverity(p.cpu, Boolean(r))],
                }}
                title={displayName(p.command)}
                accessories={accessories}
                detail={
                  <List.Item.Detail
                    markdown={cpuChart}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {/* The list row truncates long names; the detail has room for them. */}
                        <List.Item.Detail.Metadata.Label title="Process" text={displayName(p.command)} />
                        <List.Item.Detail.Metadata.Label title="PID" text={String(p.pid)} />
                        <List.Item.Detail.Metadata.Label title="CPU" text={`${p.cpu.toFixed(1)}%`} />
                        <List.Item.Detail.Metadata.Label title="Energy Impact" text={p.energy.toFixed(1)} />
                        {info && (
                          <List.Item.Detail.Metadata.Label title="Running For" text={formatDuration(info.etimeSec)} />
                        )}
                        {info && (
                          <List.Item.Detail.Metadata.Label title="CPU Time" text={formatDuration(info.cpuTimeSec)} />
                        )}
                        {info && <List.Item.Detail.Metadata.Label title="User" text={info.user} />}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={<ProcessActions process={p} info={info} seenAt={seenAt} onRefresh={refresh} />}
              />
            );
          })}
      </List.Section>

      <List.Section title="Sleep Blockers">
        {snapshot?.blockers.map((bl) => {
          const origin = startedBy(bl.pid, snapshot.processInfo);
          const originInfo = origin ? snapshot.processInfo.get(origin.pid) : undefined;
          // Short values: the metadata column truncates long text. The PID gets its own row.
          const originKind = origin?.terminal ? "terminal" : originInfo ? processKind(originInfo) : undefined;
          const originText = origin ? `${origin.command}${originKind ? ` (${originKind})` : ""}` : undefined;
          return (
            <List.Item
              key={bl.id}
              icon={Icon.Moon}
              title={bl.process}
              subtitle={origin ? `${origin.terminal ? "started in" : "started by"} ${origin.command}` : bl.name}
              accessories={[
                { tag: bl.kind === "system" ? "System sleep" : "Display sleep" },
                { text: `held ${formatDuration(bl.heldSec)}` },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Process" text={`${bl.process} (${bl.pid})`} />
                      {originText && <List.Item.Detail.Metadata.Label title="Started By" text={originText} />}
                      {origin && <List.Item.Detail.Metadata.Label title="Starter PID" text={String(origin.pid)} />}
                      {origin?.via && <List.Item.Detail.Metadata.Label title="Via" text={origin.via} />}
                      <List.Item.Detail.Metadata.Label title="Assertion" text={bl.assertion} />
                      <List.Item.Detail.Metadata.Label title="Name" text={bl.name} />
                      <List.Item.Detail.Metadata.Label title="Held For" text={formatDuration(bl.heldSec)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ProcessActions
                  process={{ pid: bl.pid, command: bl.process }}
                  info={snapshot.processInfo.get(bl.pid)}
                  note={origin && !origin.terminal ? `${origin.command} started it and may start it again.` : undefined}
                  starter={origin ? { target: origin, info: originInfo } : undefined}
                  seenAt={seenAt}
                  onRefresh={refresh}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
