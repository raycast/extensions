import { Color, environment, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { groupByApp } from "./analysis/apps";
import { chargingExplanation } from "./analysis/battery";
import { topConsumers } from "./analysis/drain";
import { detectRunaways, Runaway } from "./analysis/runaway";
import { cpuSeverity } from "./analysis/severity";
import { visibleRows } from "./analysis/visible";
import { collectSnapshot } from "./collectors/snapshot";
import { raycastStorage } from "./history/raycast-storage";
import { dirLock } from "./history/lock";
import { appendSample, toSample } from "./history/store";
import { displayName, ENERGY_TOOLTIP, formatClock, formatDuration, formatUsage, formatWatts } from "./render/format";
import { batterySummary, sourceWarning } from "./render/summary";
import { SEVERITY_COLOR } from "./render/tint";
import { notifyNewRunaways } from "./notify/runaway-notifier";
import { notifyRunaways, thresholds } from "./preferences";
import { Sample, Snapshot } from "./types";

type State = { snapshot: Snapshot; history: Sample[]; runaways: Runaway[] };

const THIRTY_MIN = 30 * 60 * 1000;

const openDiagnose = () => launchCommand({ name: "diagnose-battery-drain", type: LaunchType.UserInitiated });

// A desktop Mac has neither battery nor power telemetry: show the icon alone rather than a permanent "– W".
const menuTitle = (s: Snapshot) =>
  s.battery.systemLoadW === undefined && s.battery.percent === undefined ? "" : formatWatts(s.battery.systemLoadW, 0);

export default function Command() {
  const [state, setState] = useState<State>();
  const [failed, setFailed] = useState(false);
  // Every run starts a fresh tree; keep the last readout so the menu bar does not blank out while collecting.
  const [last, setLast] = useCachedState<{ title: string }>("menu-bar-last", { title: "– W" });

  useEffect(() => {
    (async () => {
      const th = thresholds();
      const snapshot = await collectSnapshot();
      const sample = toSample(snapshot);
      // A storage failure must not hide a good snapshot; fall back to this sample alone, and say so.
      const history = await appendSample(raycastStorage, sample, dirLock(environment.supportPath)).catch((e) => {
        snapshot.errors.push(`history: ${e instanceof Error ? e.message : String(e)}`);
        return [sample];
      });
      // appendSample returns the history including this snapshot's sample; analysis takes the snapshot separately.
      const previous = history.slice(0, -1);
      const runaways = detectRunaways(previous, snapshot, th);
      // Notify before rendering: once isLoading turns false, Raycast may unload the command.
      // Best effort: a failed notification must not break the menu bar.
      if (notifyRunaways()) await notifyNewRunaways(runaways, snapshot).catch(() => undefined);
      setState({ snapshot, history, runaways });
      setLast({ title: menuTitle(snapshot) });
    })().catch(() => setFailed(true));
    // Collect exactly once per run: Raycast launches the command afresh for every interval and menu open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The same chip as the Now row in Diagnose: both show the whole system's draw. No tint: it follows
  // the menu bar's own color; warnings appear inside the menu and as notifications.
  const icon = Icon.ComputerChip;
  const s = state?.snapshot;

  if (!state || !s) {
    return (
      <MenuBarExtra icon={icon} title={last.title} isLoading={!failed}>
        {failed && <MenuBarExtra.Item title="Could Not Read Power Data" />}
      </MenuBarExtra>
    );
  }

  const updated = s.battery.updatedAt !== undefined ? ` at ${formatClock(s.battery.updatedAt)}` : "";
  const battery = batterySummary(s, state.history);
  const warning = sourceWarning(s.errors);
  const mostly = topConsumers(state.history, s.t, THIRTY_MIN, 2);
  const blockerNames = [...new Set(s.blockers.map((b) => (b.name === "Handoff" ? "Handoff" : b.process)))];

  return (
    <MenuBarExtra icon={icon} title={menuTitle(s)} tooltip="Battery Drain">
      {warning && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            title={warning}
            onAction={openDiagnose}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Now"
          subtitle={`${formatWatts(s.battery.systemLoadW)}${updated}`}
          tooltip={
            s.battery.systemLoadLive
              ? "System power draw, measured live when the menu last refreshed"
              : `System power draw and when macOS last measured it (about once a minute)${s.battery.systemLoadEstimated ? "; estimated from the battery" : ""}`
          }
          onAction={openDiagnose}
        />
        {battery && (
          <MenuBarExtra.Item
            title="Battery"
            subtitle={battery}
            tooltip={
              [
                chargingExplanation(s.battery, s.source),
                mostly.length > 0 ? `Mostly ${mostly.join(", ")} over the last 30 minutes` : undefined,
              ]
                .filter(Boolean)
                .join(". ") || undefined
            }
            onAction={openDiagnose}
          />
        )}
      </MenuBarExtra.Section>

      {state.runaways.length > 0 && (
        <MenuBarExtra.Section>
          {state.runaways.map((r) => (
            <MenuBarExtra.Item
              key={r.pid}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title={`Runaway: ${displayName(r.command)}`}
              subtitle={`${Math.round(r.cpu)}% CPU for ${formatDuration(r.sinceSec)}`}
              onAction={openDiagnose}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Energy Impact by App">
        {visibleRows(groupByApp(s.processes, s.processInfo)).map((app) => (
          <MenuBarExtra.Item
            key={app.name}
            icon={{ source: Icon.CircleFilled, tintColor: SEVERITY_COLOR[cpuSeverity(app.cpu, false)] }}
            title={app.name}
            subtitle={formatUsage(app)}
            tooltip={ENERGY_TOOLTIP}
            onAction={openDiagnose}
          />
        ))}
      </MenuBarExtra.Section>

      {blockerNames.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Moon}
            title="Sleep Blocked by"
            subtitle={blockerNames.join(", ")}
            onAction={openDiagnose}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Diagnose Battery Drain…"
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={openDiagnose}
        />
        <MenuBarExtra.Item
          title="Open Activity Monitor"
          onAction={() => open("/System/Applications/Utilities/Activity Monitor.app")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
