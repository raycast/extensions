/**
 * Dashboard command: the panels chosen in the extension preferences, drawn as
 * cards two per row, with warning pills above them when something is wrong.
 */

import { ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { OpenMonitorAction } from "./components/Actions";
import { ErrorNotice } from "./components/ErrorNotice";
import { InactiveNotice } from "./components/InactiveNotice";
import { UpdateNotice } from "./components/UpdateNotice";
import { metricValue, SortMetric } from "./data/queries";
import { AppGroup, SystemHistoryPoint, SystemSnapshot } from "./data/types";
import { useLiveStats } from "./hooks/useLiveStats";
import {
  generateAreaChart,
  generateDualAreaChart,
  generateMiniLeaderboardCard,
  generateStackedBar,
  generateWarningPills,
  LeaderboardItem,
  renderCardRow,
  WarningPill,
} from "./utils/charts";
import { formatBytes, formatPercent, formatRate, formatTemp } from "./utils/formatting";
import { memorySlices, memorySubtitle, pressureColor } from "./utils/memory";

// Card geometry: two cards of CARD_WIDTH plus a gap make one ROW_WIDTH row.
const CARD_WIDTH = 374;
const CARD_HEIGHT = 180;
const ROW_WIDTH = 760;

/**
 * Builds the warning pills shown above the cards. Thresholds follow the app's
 * own bands: memory pressure 34 / 67 (or the kernel's warning / critical level),
 * thermal state serious or critical, CPU 85%.
 */
function buildWarnings(snapshot: SystemSnapshot): WarningPill[] {
  const warnings: WarningPill[] = [];

  const pressureLabel = "Memory Pressure " + formatPercent(snapshot.pressurePercent);
  if (snapshot.pressurePercent >= 67 || snapshot.pressureLevel === 4) {
    warnings.push({ id: "pressure", label: pressureLabel, level: "critical" });
  } else if (snapshot.pressurePercent >= 34 || snapshot.pressureLevel === 2) {
    warnings.push({ id: "pressure", label: pressureLabel, level: "warning" });
  }

  if (snapshot.thermalState === "critical" || snapshot.thermalState === "serious") {
    warnings.push({ id: "thermals", label: "Thermal throttling: " + snapshot.thermalState, level: "critical" });
  } else if (snapshot.cpuDieTemp !== null && snapshot.cpuDieTemp >= 85) {
    warnings.push({ id: "cpu_temp", label: "High CPU Temp " + formatTemp(snapshot.cpuDieTemp), level: "warning" });
  }

  if (snapshot.cpuLoad >= 0.85) {
    warnings.push({
      id: "cpu_load",
      label: "Heavy CPU Load " + formatPercent(snapshot.cpuLoad * 100),
      level: "warning",
    });
  }

  if (snapshot.batteryPresent && snapshot.batteryCharge <= 20 && !snapshot.batteryCharging) {
    warnings.push({
      id: "battery",
      label: "Low Battery " + Math.round(snapshot.batteryCharge) + "%",
      level: "warning",
    });
  }

  return warnings;
}

/** Formats one app's value for a leaderboard card. */
function formatMetric(app: AppGroup, metric: SortMetric): string {
  switch (metric) {
    case "memory":
      return formatBytes(app.memoryBytes);
    case "cpu":
      return formatPercent(app.cpuPercent);
    case "gpu":
      return formatPercent(app.gpuPercent);
    case "disk":
      return formatRate(app.diskReadBytes + app.diskWrittenBytes);
    case "energy":
      return app.energyImpact.toFixed(1);
  }
}

/** The top five apps by a metric, skipping apps whose value is zero. */
function topApps(apps: AppGroup[], metric: SortMetric): LeaderboardItem[] {
  const sorted = apps.slice();
  sorted.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));

  const items: LeaderboardItem[] = [];
  for (const app of sorted) {
    if (items.length === 5 || metricValue(app, metric) <= 0) {
      break;
    }
    items.push({ name: app.appName, value: formatMetric(app, metric) });
  }
  return items;
}

/** Everything a card might need to draw itself. */
interface CardData {
  snapshot: SystemSnapshot;
  history: SystemHistoryPoint[];
  apps: AppGroup[];
}

/** Draws one half-width card for a panel id, or null when the panel has nothing to show. */
function renderCard(panelId: string, data: CardData): string | null {
  const history = data.history;

  switch (panelId) {
    case "memory_pressure":
      return generateAreaChart(
        history.map((h) => h.memoryPressure),
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          label: "Memory Pressure",
          color: pressureColor(data.snapshot.pressurePercent),
          unit: "%",
          maxValue: 100,
          idPrefix: "mem",
        },
      );

    case "memory_composition":
      return generateStackedBar(
        memorySlices(data.snapshot),
        data.snapshot.totalRam,
        "Memory",
        CARD_WIDTH,
        CARD_HEIGHT,
        memorySubtitle(data.snapshot),
      );

    case "cpu_usage":
      return generateAreaChart(
        history.map((h) => h.cpuPercent),
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          label: "CPU Usage",
          color: "#BF5AF2",
          unit: "%",
          maxValue: 100,
          idPrefix: "cpu",
        },
      );

    case "gpu_usage":
      return generateAreaChart(
        history.map((h) => h.gpuPercent),
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          label: "GPU Usage",
          color: "#30D158",
          unit: "%",
          maxValue: 100,
          idPrefix: "gpu",
        },
      );

    case "disk_io":
      return generateDualAreaChart(
        history.map((h) => h.diskReadMb),
        history.map((h) => h.diskWriteMb),
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          title: "Disk Throughput",
          labelA: "Read",
          labelB: "Write",
          colorA: "#64D2FF",
          colorB: "#FF9F0A",
          unit: "MB/s",
          idPrefix: "disk",
        },
      );

    case "power_consumption":
      return generateAreaChart(
        history.map((h) => h.powerWatts),
        { width: CARD_WIDTH, height: CARD_HEIGHT, label: "Power Draw", color: "#FFD60A", unit: "W", idPrefix: "power" },
      );

    case "thermals":
      return generateDualAreaChart(
        history.map((h) => h.cpuTemp),
        history.map((h) => h.gpuTemp),
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          title: "Thermals",
          labelA: "CPU Die",
          labelB: "GPU Die",
          colorA: "#FF453A",
          colorB: "#FF9F0A",
          unit: "°C",
          idPrefix: "thermals",
        },
      );

    case "top_memory":
      return generateMiniLeaderboardCard(
        "Top Memory",
        topApps(data.apps, "memory"),
        "#0A84FF",
        CARD_WIDTH,
        CARD_HEIGHT,
      );
    case "top_cpu":
      return generateMiniLeaderboardCard("Top CPU", topApps(data.apps, "cpu"), "#BF5AF2", CARD_WIDTH, CARD_HEIGHT);
    case "top_gpu":
      return generateMiniLeaderboardCard("Top GPU", topApps(data.apps, "gpu"), "#30D158", CARD_WIDTH, CARD_HEIGHT);
    case "top_disk":
      return generateMiniLeaderboardCard("Top Disk", topApps(data.apps, "disk"), "#64D2FF", CARD_WIDTH, CARD_HEIGHT);
    case "top_energy":
      return generateMiniLeaderboardCard(
        "Top Energy",
        topApps(data.apps, "energy"),
        "#FFD60A",
        CARD_WIDTH,
        CARD_HEIGHT,
      );

    default:
      // "none" or an unknown id: leave the slot empty.
      return null;
  }
}

/** Reads the 12 slot preferences in order. Raycast fills in the defaults from package.json. */
function readSlots(prefs: Preferences.Dashboard): string[] {
  return [
    prefs.slot1,
    prefs.slot2,
    prefs.slot3,
    prefs.slot4,
    prefs.slot5,
    prefs.slot6,
    prefs.slot7,
    prefs.slot8,
    prefs.slot9,
    prefs.slot10,
    prefs.slot11,
    prefs.slot12,
  ];
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Dashboard>();
  const stats = useLiveStats({ sortMetric: "cpu" });
  const snapshot = stats.snapshot;

  if (stats.isLoading) {
    return <Detail isLoading />;
  }
  if (stats.error !== undefined) {
    return <ErrorNotice error={stats.error} onRetry={stats.refresh} />;
  }
  if (stats.outdatedVersion !== null) {
    return <UpdateNotice installedVersion={stats.outdatedVersion} />;
  }
  if (!stats.isAppRunning || snapshot === null) {
    return <InactiveNotice />;
  }

  const data: CardData = {
    snapshot: snapshot,
    history: stats.history,
    apps: stats.apps,
  };
  const tick = snapshot.timestamp;
  const sections: string[] = [];

  const pills = generateWarningPills(buildWarnings(snapshot), ROW_WIDTH);
  if (pills !== null) {
    sections.push("![Warnings - " + tick + "](" + pills + "?raycast-width=" + ROW_WIDTH + ")");
  }

  // Walk the slots two at a time; each pair becomes one row image.
  const slots = readSlots(prefs);
  let rowCount = 0;
  for (let i = 0; i < slots.length; i += 2) {
    const leftCard = renderCard(slots[i], data);
    const rightCard = renderCard(slots[i + 1], data);
    if (leftCard === null && rightCard === null) {
      continue;
    }
    rowCount += 1;
    const row = renderCardRow(leftCard === null ? "" : leftCard, rightCard, ROW_WIDTH, CARD_HEIGHT);
    sections.push("![Row " + rowCount + " - " + tick + "](" + row + "?raycast-width=" + ROW_WIDTH + ")");
  }

  if (rowCount === 0) {
    sections.push("### No dashboard panels selected\n\nOpen the extension preferences to assign panels to slots.");
  }

  return (
    <Detail
      markdown={sections.join("\n\n")}
      actions={
        <ActionPanel>
          <OpenMonitorAction />
        </ActionPanel>
      }
    />
  );
}
