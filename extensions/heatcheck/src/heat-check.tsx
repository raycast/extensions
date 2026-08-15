import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  buildVerdict,
  ChecksumMismatchError,
  collectSnapshot,
  fanEffortPct,
  type FanReading,
  type ProcessStat,
  type SystemSnapshot,
  type Verdict,
} from "./system";

// ─── color maps ───────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<Verdict["level"], Color> = {
  cool: Color.Green,
  busy: Color.Blue,
  warm: Color.Orange,
  hot: Color.Red,
};

const MEM_PRESSURE_COLOR: Record<SystemSnapshot["memoryPressure"], Color> = {
  normal: Color.Green,
  warning: Color.Orange,
  critical: Color.Red,
  unknown: Color.SecondaryText,
};

function cpuColor(cpu: number): Color {
  if (cpu >= 70) return Color.Red;
  if (cpu >= 40) return Color.Orange;
  if (cpu >= 15) return Color.Blue;
  return Color.Green;
}

// Each metric colors its own row, and only when elevated — a normal reading stays
// neutral so the one thing that is actually warm draws the eye. undefined means
// "no tint": the value renders in default text and the icon in SecondaryText.

// Yellow reads poorly on a light background, so the scale skips it: orange for
// "warm", red for "hot". Apple Silicon runs hot by design, so the temperature
// bands start at 85°C / 95°C — the same thresholds the verdict uses.
function tempColor(c: number): Color | undefined {
  if (c >= 95) return Color.Red;
  if (c >= 85) return Color.Orange;
  return undefined;
}

// CPU load as a share of all cores: half the machine is notable, 80%+ is heavy.
function loadColor(pct: number): Color | undefined {
  if (pct >= 80) return Color.Red;
  if (pct >= 50) return Color.Orange;
  return undefined;
}

// A fan's effort against its own rated max, matching the verdict's fan bands.
function fanColor(effort: number): Color | undefined {
  if (effort >= 85) return Color.Red;
  if (effort >= 70) return Color.Orange;
  return undefined;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function powerLabel(snap: SystemSnapshot): string {
  if (snap.isCharging) return "Charging";
  if (snap.powerSource === "ac") return "AC, not charging";
  if (snap.powerSource === "battery") return "On battery";
  return "Unknown";
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function FanItem({
  fan,
  label,
  onRefresh,
}: {
  fan: FanReading;
  label: string;
  onRefresh: () => void;
}) {
  const effort = fanEffortPct(fan);
  const color = fanColor(effort);
  return (
    <List.Item
      title={label}
      icon={{ source: Icon.Wind, tintColor: color ?? Color.SecondaryText }}
      accessories={[
        {
          text: {
            value: `${fan.rpm.toLocaleString()} RPM · ${effort.toFixed(0)}%`,
            color,
          },
          tooltip: "Current speed and share of this fan's rated maximum",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function TempItem({
  title,
  icon,
  celsius,
  onRefresh,
}: {
  title: string;
  icon: Icon;
  celsius: number;
  onRefresh: () => void;
}) {
  const color = tempColor(celsius);
  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor: color ?? Color.SecondaryText }}
      accessories={[{ text: { value: `${celsius.toFixed(0)}°C`, color } }]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function ProcessItem({
  proc,
  onRefresh,
}: {
  proc: ProcessStat;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      title={proc.name}
      subtitle={`PID ${proc.pid}`}
      accessories={[
        {
          tag: { value: `${proc.cpu.toFixed(1)}%`, color: cpuColor(proc.cpu) },
          tooltip: "CPU usage (share of whole machine)",
        },
        {
          text:
            proc.memMB >= 1024
              ? `${(proc.memMB / 1024).toFixed(1)} GB`
              : `${proc.memMB} MB`,
          tooltip: "Memory (RSS)",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Close (SIGTERM)"
            icon={Icon.Stop}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Close ${proc.name}?`,
                  message: `PID ${proc.pid}. This will ask the process to quit gracefully.`,
                  icon: Icon.Stop,
                })
              ) {
                try {
                  process.kill(proc.pid, "SIGTERM");
                  showToast({
                    style: Toast.Style.Success,
                    title: `Closed ${proc.name} (PID ${proc.pid})`,
                  });
                  onRefresh();
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: `Failed to close ${proc.name}`,
                    message: String(e),
                  });
                }
              }
            }}
          />
          <Action
            title="Force Kill (SIGKILL)"
            icon={Icon.ExclamationMark}
            shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Force Kill ${proc.name}?`,
                  message: `PID ${proc.pid}. This will immediately terminate the process.`,
                  icon: Icon.ExclamationMark,
                })
              ) {
                try {
                  process.kill(proc.pid, "SIGKILL");
                  showToast({
                    style: Toast.Style.Success,
                    title: `Killed ${proc.name} (PID ${proc.pid})`,
                  });
                  onRefresh();
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: `Failed to kill ${proc.name}`,
                    message: String(e),
                  });
                }
              }
            }}
          />
          <Action
            title="Copy PID"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => {
              Clipboard.copy(String(proc.pid));
              showToast({
                style: Toast.Style.Success,
                title: `Copied PID ${proc.pid}`,
              });
            }}
          />
          <Action
            title="Copy Name"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => {
              Clipboard.copy(proc.name);
              showToast({
                style: Toast.Style.Success,
                title: `Copied ${proc.name}`,
              });
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export default function HeatCheck() {
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const {
    data: snap,
    isLoading,
    revalidate,
  } = useCachedPromise(collectSnapshot, [], {
    // A checksum alert stops collection so we don't re-attempt a tampered
    // download; clearing it flips execute back on and the hook re-runs.
    execute: !securityAlert,
    onError(err) {
      // A tampered/corrupted sensor binary is a security event, not a transient
      // read failure — alarm distinctly and stop refreshing. Anything else
      // surfaces as an error rather than being swallowed.
      if (!(err instanceof ChecksumMismatchError)) throw err;
      setSecurityAlert(err.message);
      void showToast({
        style: Toast.Style.Failure,
        title: "iSMC checksum mismatch",
        message:
          "The downloaded sensor binary failed verification — not running it.",
      });
    },
  });

  // Skip a poll tick while a collection is in flight — each one spawns several
  // subprocesses and stacking them adds measurable load to what we're measuring.
  const refresh = useCallback(() => {
    if (!isLoading) revalidate();
  }, [isLoading, revalidate]);

  useEffect(() => {
    if (securityAlert) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [securityAlert, refresh]);

  const refreshActions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={refresh}
      />
    </ActionPanel>
  );

  if (securityAlert) {
    return (
      <List navigationTitle="Heat Check" searchBarPlaceholder="">
        <List.Item
          title="iSMC checksum mismatch"
          subtitle="The downloaded sensor binary failed hash verification and was not run"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          accessories={[{ tag: { value: "Blocked", color: Color.Red } }]}
          actions={
            <ActionPanel>
              <Action
                title="Retry Download"
                icon={Icon.RotateClockwise}
                onAction={() => setSecurityAlert(null)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Details"
          subtitle={securityAlert}
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
        />
      </List>
    );
  }

  const verdict = snap ? buildVerdict(snap) : null;
  const t = snap?.temps;

  return (
    <List
      isLoading={isLoading && !snap}
      searchBarPlaceholder="Filter processes…"
      actions={refreshActions}
    >
      {snap && verdict && t && (
        <>
          {/* ── verdict ── */}
          <List.Section>
            <List.Item
              title={verdict.headline}
              subtitle={verdict.detail}
              icon={{
                source: Icon.Bolt,
                tintColor: LEVEL_COLOR[verdict.level],
              }}
              accessories={[
                {
                  tag: {
                    value: capitalize(verdict.level),
                    color: LEVEL_COLOR[verdict.level],
                  },
                  tooltip: "Overall state",
                },
              ]}
              actions={refreshActions}
            />
          </List.Section>

          {/* ── temperatures ── */}
          <List.Section title="Temperatures">
            {t.cpuMaxC != null &&
              (() => {
                const color = tempColor(t.cpuMaxC);
                return (
                  <List.Item
                    title="CPU"
                    icon={{
                      source: Icon.Temperature,
                      tintColor: color ?? Color.SecondaryText,
                    }}
                    accessories={[
                      {
                        text: {
                          value:
                            t.cpuAvgC != null
                              ? `${t.cpuMaxC.toFixed(0)}°C max · ${t.cpuAvgC.toFixed(0)}°C avg`
                              : `${t.cpuMaxC.toFixed(0)}°C`,
                          color,
                        },
                        tooltip: "Hottest CPU sensor and die average",
                      },
                    ]}
                    actions={refreshActions}
                  />
                );
              })()}

            {t.gpuC != null && (
              <TempItem
                title="GPU"
                icon={Icon.Temperature}
                celsius={t.gpuC}
                onRefresh={refresh}
              />
            )}

            {t.ssdC != null && (
              <TempItem
                title="SSD"
                icon={Icon.HardDrive}
                celsius={t.ssdC}
                onRefresh={refresh}
              />
            )}

            {t.batteryC != null && (
              <TempItem
                title="Battery"
                icon={Icon.Battery}
                celsius={t.batteryC}
                onRefresh={refresh}
              />
            )}

            {t.cpuMaxC == null && (
              <List.Item
                title="Temperature"
                subtitle={
                  snap.sensorsAvailable
                    ? "No sensors detected"
                    : "Sensors unavailable"
                }
                icon={{
                  source: Icon.Temperature,
                  tintColor: Color.SecondaryText,
                }}
                actions={refreshActions}
              />
            )}
          </List.Section>

          {/* ── cooling & system ── */}
          <List.Section title="System">
            {snap.fans.length > 0 ? (
              snap.fans.map((fan, i) => (
                <FanItem
                  key={i}
                  fan={fan}
                  label={snap.fans.length > 1 ? `Fan ${i + 1}` : "Fan"}
                  onRefresh={refresh}
                />
              ))
            ) : (
              <List.Item
                title="Fan"
                subtitle={
                  snap.sensorsAvailable
                    ? "No fan detected"
                    : "Sensors unavailable"
                }
                icon={{ source: Icon.Wind, tintColor: Color.SecondaryText }}
                actions={refreshActions}
              />
            )}

            <List.Item
              title="CPU Load"
              icon={{
                source: Icon.Gauge,
                tintColor: loadColor(snap.loadPct) ?? Color.SecondaryText,
              }}
              accessories={[
                {
                  text: {
                    value: `${snap.loadPct.toFixed(0)}% of ${snap.coreCount} cores`,
                    color: loadColor(snap.loadPct),
                  },
                  tooltip: "Machine-wide 1-minute load average",
                },
              ]}
              actions={refreshActions}
            />

            <List.Item
              title="Power"
              icon={{
                source: snap.isCharging
                  ? Icon.BatteryCharging
                  : snap.powerSource === "ac"
                    ? Icon.Plug
                    : Icon.Battery,
                tintColor: Color.PrimaryText,
              }}
              accessories={[{ text: powerLabel(snap) }]}
              actions={refreshActions}
            />

            <List.Item
              title="Memory Pressure"
              icon={{
                source: Icon.MemoryChip,
                tintColor: MEM_PRESSURE_COLOR[snap.memoryPressure],
              }}
              accessories={[
                {
                  tag: {
                    value: capitalize(snap.memoryPressure),
                    color: MEM_PRESSURE_COLOR[snap.memoryPressure],
                  },
                },
              ]}
              actions={refreshActions}
            />
          </List.Section>

          {/* ── top processes ── */}
          <List.Section title="Top Processes">
            {snap.topProcesses.map((proc) => (
              <ProcessItem key={proc.pid} proc={proc} onRefresh={refresh} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
