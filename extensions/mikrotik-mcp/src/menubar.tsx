/**
 * Menu-bar cockpit — a live at-a-glance MikroTik fleet status that lives in the
 * macOS menu bar. The bar title encodes fleet health (online/total + an alert
 * badge, tinted green/amber/red); the dropdown shows per-device health, live
 * activity metrics, the most recent tool calls, alerts, and quick jumps into the
 * other commands or the web dashboard. Refreshes in the background on `interval`.
 */
import { useEffect } from "react";
import {
  Clipboard,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openExtensionPreferences,
  updateCommandMetadata,
} from "@raycast/api";
import { withToken } from "./lib/api";
import { RISK_COLOR, clock, ms, num, riskLabel } from "./lib/format";
import { useApi } from "./lib/hooks";
import type { DeviceInfo, DevicesPayload, Stats, ToolEvent } from "./lib/types";

type Health = "good" | "warn" | "bad" | "unknown";
const HEALTH_TINT: Record<Health, Color> = {
  good: Color.Green,
  warn: Color.Yellow,
  bad: Color.Red,
  unknown: Color.SecondaryText,
};

function open_(cmd: string) {
  return () => {
    launchCommand({ name: cmd, type: LaunchType.UserInitiated }).catch(
      () => {},
    );
  };
}

function pct(n: number | undefined): string {
  return n == null ? "—" : `${Math.round(n)}%`;
}

export default function Command() {
  const devicesQ = useApi<DevicesPayload>("/api/devices");
  const statsQ = useApi<Stats>("/api/stats?window=3600000&buckets=1");
  const eventsQ = useApi<{ events: ToolEvent[] }>("/api/events?limit=6");

  const devices = devicesQ.data?.devices ?? [];
  const enabled = devices.filter((d) => !d.disabled);
  const online = enabled.filter((d) => d.status.reachable === true);
  const offline = enabled.filter((d) => d.status.reachable === false);
  const hot = enabled.filter(
    (d) => (d.status.cpuLoad ?? 0) >= 85 || (d.status.memUsedPct ?? 0) >= 85,
  );
  const total = enabled.length;
  const stats = statsQ.data;
  const events = eventsQ.data?.events ?? [];
  const unreachable = !!devicesQ.error && !devicesQ.data;

  const alerts = offline.length + hot.length;
  const health: Health = unreachable
    ? "bad"
    : offline.length > 0
      ? "bad"
      : hot.length > 0 || (stats ? stats.errorRate >= 0.2 : false)
        ? "warn"
        : total > 0
          ? "good"
          : "unknown";

  const title = unreachable
    ? "offline"
    : total === 0
      ? "MikroTik"
      : `${online.length}/${total}${alerts > 0 ? ` ⚠${alerts}` : ""}`;

  // Keep the root-search subtitle in sync for background glances.
  useEffect(() => {
    if (unreachable) {
      updateCommandMetadata({ subtitle: "Dashboard unreachable" }).catch(
        () => {},
      );
    } else if (total > 0) {
      const rate = stats ? ` · ${stats.callsPerMin.toFixed(0)}/min` : "";
      updateCommandMetadata({
        subtitle: `${online.length}/${total} online${rate}`,
      }).catch(() => {});
    }
  }, [online.length, total, stats?.callsPerMin, unreachable]);

  function deviceDot(d: DeviceInfo): { source: Icon; tintColor: Color } {
    const r = d.status.reachable;
    const hotDev =
      (d.status.cpuLoad ?? 0) >= 85 || (d.status.memUsedPct ?? 0) >= 85;
    return {
      source: Icon.Dot,
      tintColor:
        r === false
          ? Color.Red
          : hotDev
            ? Color.Yellow
            : r === true
              ? Color.Green
              : Color.SecondaryText,
    };
  }

  return (
    <MenuBarExtra
      isLoading={devicesQ.isLoading && !devicesQ.data}
      icon={{ source: Icon.Wifi, tintColor: HEALTH_TINT[health] }}
      title={title}
      tooltip={
        unreachable
          ? "MikroTik MCP — dashboard unreachable"
          : `MikroTik MCP — ${online.length}/${total} online`
      }
    >
      {unreachable ? (
        <MenuBarExtra.Section title="Dashboard">
          <MenuBarExtra.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Dashboard unreachable"
            subtitle="check URL / token"
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      ) : null}

      {!unreachable ? (
        <MenuBarExtra.Section title="Fleet">
          {enabled.slice(0, 10).map((d) => (
            <MenuBarExtra.Item
              key={d.name}
              icon={deviceDot(d)}
              title={d.name}
              subtitle={
                d.status.reachable === true
                  ? `${pct(d.status.cpuLoad)} cpu · ${pct(d.status.memUsedPct)} mem`
                  : d.status.reachable === false
                    ? "offline"
                    : "checking…"
              }
              onAction={open_("devices")}
              alternate={
                <MenuBarExtra.Item
                  icon={Icon.Clipboard}
                  title={`Copy ${d.address ?? `${d.host}:${d.port}`}`}
                  onAction={() =>
                    Clipboard.copy(d.address ?? `${d.host}:${d.port}`)
                  }
                />
              }
            />
          ))}
          {enabled.length === 0 ? (
            <MenuBarExtra.Item title="No devices configured" />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {stats ? (
        <MenuBarExtra.Section title="Activity (1h)">
          <MenuBarExtra.Item
            icon={Icon.BarChart}
            title="Calls"
            subtitle={`${num(stats.total)} · ${stats.callsPerMin.toFixed(1)}/min`}
            onAction={open_("overview")}
          />
          <MenuBarExtra.Item
            icon={{
              source: Icon.Dot,
              tintColor:
                stats.errorRate >= 0.2
                  ? Color.Red
                  : stats.errorRate >= 0.05
                    ? Color.Yellow
                    : Color.Green,
            }}
            title="Error rate"
            subtitle={`${(stats.errorRate * 100).toFixed(1)}% (${stats.errors})`}
            onAction={open_("overview")}
          />
          <MenuBarExtra.Item
            icon={Icon.Clock}
            title="Latency"
            subtitle={`avg ${ms(stats.latency.avg)} · p95 ${ms(stats.latency.p95)}`}
            onAction={open_("overview")}
          />
        </MenuBarExtra.Section>
      ) : null}

      {events.length ? (
        <MenuBarExtra.Section title="Recent calls">
          {events.slice(0, 5).map((e) => (
            <MenuBarExtra.Item
              key={e.id}
              icon={{ source: Icon.Dot, tintColor: RISK_COLOR[e.risk] }}
              title={e.tool}
              subtitle={`${riskLabel(e.risk)} · ${e.isError ? "error" : "ok"} · ${ms(e.durationMs)} · ${clock(e.ts)}`}
              onAction={open_("feed")}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {alerts > 0 ? (
        <MenuBarExtra.Section title={`Alerts (${alerts})`}>
          {offline.map((d) => (
            <MenuBarExtra.Item
              key={`off-${d.name}`}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              title={d.name}
              subtitle="offline"
              onAction={open_("devices")}
            />
          ))}
          {hot.map((d) => (
            <MenuBarExtra.Item
              key={`hot-${d.name}`}
              icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
              title={d.name}
              subtitle={`${pct(d.status.cpuLoad)} cpu · ${pct(d.status.memUsedPct)} mem`}
              onAction={open_("devices")}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section title="Open">
        <MenuBarExtra.Item
          icon={Icon.BarChart}
          title="Overview"
          onAction={open_("overview")}
        />
        <MenuBarExtra.Item
          icon={Icon.Livestream}
          title="Live Feed"
          onAction={open_("feed")}
        />
        <MenuBarExtra.Item
          icon={Icon.HardDrive}
          title="Devices"
          onAction={open_("devices")}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Dashboard in Browser"
          onAction={() => open(withToken("/"))}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => {
            devicesQ.revalidate();
            statsQ.revalidate();
            eventsQ.revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Configure…"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
