import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getHealthMetrics, getTrainingStatus } from "./api/client";
import {
  HealthMetricsResponse,
  LoadBand,
  ReadinessBand,
  ReadinessDriver,
  TrainingStatus,
} from "./api/types";
import { formatDate, formatDuration, toLocalDateString } from "./utils";

// Labels, colors and copy mirror the Overview page on shapecalendar.com.
const READINESS_BANDS: Record<
  ReadinessBand,
  { label: string; color: Color; advice: string }
> = {
  prime: {
    label: "Prime",
    color: Color.Blue,
    advice: "Recovered and ready. A good day for the hard session.",
  },
  high: {
    label: "High",
    color: Color.Green,
    advice: "Well recovered. Most sessions are on the table.",
  },
  moderate: {
    label: "Moderate",
    color: Color.Green,
    advice: "Recovered enough to train. Keep it to your usual load.",
  },
  low: {
    label: "Low",
    color: Color.Orange,
    advice: "Recovery is lagging. Steady or easy work today.",
  },
  poor: {
    label: "Poor",
    color: Color.Red,
    advice: "You have not recovered. Rest is the session.",
  },
};

const LOAD_BANDS: Record<
  LoadBand,
  { label: string; color: Color; verdict: string; planned: string }
> = {
  low: {
    label: "Low",
    color: Color.Blue,
    verdict: "Below your usual base. Room to build.",
    planned: "Your plan dips below your usual base.",
  },
  safe: {
    label: "Balanced",
    color: Color.Green,
    verdict: "Building at a sustainable rate.",
    planned: "Your plan builds at a sustainable rate.",
  },
  elevated: {
    label: "Elevated",
    color: Color.Orange,
    verdict: "Climbing quicker than your base supports.",
    planned: "Your plan climbs quicker than your base supports.",
  },
  high: {
    label: "High",
    color: Color.Red,
    verdict: "Well past your base. Time to absorb the work.",
    planned: "Your plan pushes well past your base.",
  },
};

const READINESS_UNAVAILABLE: Record<
  NonNullable<TrainingStatus["readinessUnavailable"]>,
  string
> = {
  no_body_metrics: "Connect Garmin or Apple Health",
  no_readings_today: "Waiting for today's sleep or HRV reading",
  insufficient_baseline: "Learning your baseline",
};

const LOAD_UNAVAILABLE: Record<
  NonNullable<TrainingStatus["loadUnavailable"]>,
  string
> = {
  no_workouts: "Starts with your first workout",
  no_load_data: "Your workouts have no heart rate or power to score",
};

const HEALTH_TILES: {
  key: string;
  label: string;
  icon: Icon;
  format: (n: number) => string;
}[] = [
  {
    key: "sleepDurationSec",
    label: "Sleep",
    icon: Icon.Moon,
    format: formatDuration,
  },
  {
    key: "restingHR",
    label: "Resting HR",
    icon: Icon.Heart,
    format: (n) => `${Math.round(n)} bpm`,
  },
  {
    key: "hrvMs",
    label: "HRV",
    icon: Icon.Heartbeat,
    format: (n) => `${Math.round(n)} ms`,
  },
  {
    key: "avgStress",
    label: "Stress",
    icon: Icon.Gauge,
    format: (n) => `${Math.round(n)}`,
  },
  {
    key: "bodyBatteryCharged",
    label: "Body Battery",
    icon: Icon.Battery,
    format: (n) => `+${Math.round(n)}`,
  },
  {
    key: "steps",
    label: "Steps",
    icon: Icon.Footprints,
    format: (n) => Math.round(n).toLocaleString(),
  },
  {
    key: "vo2max",
    label: "VO2 Max",
    icon: Icon.Wind,
    format: (n) => n.toFixed(1),
  },
  {
    key: "weightKg",
    label: "Weight",
    icon: Icon.Weights,
    format: (n) => `${n.toFixed(1)} kg`,
  },
];

function bandForRatio(ratio: number): LoadBand {
  if (ratio < 0.8) return "low";
  if (ratio <= 1.3) return "safe";
  if (ratio <= 1.5) return "elevated";
  return "high";
}

function formatDriverValue(driver: ReadinessDriver): string {
  switch (driver.key) {
    case "hrv":
      return `${Math.round(driver.value)} ms`;
    case "restingHR":
      return `${Math.round(driver.value)} bpm`;
    case "sleep":
      return formatDuration(driver.value);
    case "load":
      return driver.value.toFixed(2);
    case "exertion":
      return `${Math.round(driver.value)} load`;
    default:
      return String(Math.round(driver.value));
  }
}

function formatDeviation(z: number): string {
  return `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
}

function subtitleFor(status: TrainingStatus): string {
  const parts: string[] = [];
  if (status.readiness) {
    const { score, band } = status.readiness;
    parts.push(`Readiness ${score}% ${READINESS_BANDS[band].label}`);
  }
  if (status.load) {
    const { ratio, band, fitness } = status.load;
    if (ratio !== null && band) {
      parts.push(`Balance ${ratio.toFixed(2)} ${LOAD_BANDS[band].label}`);
    }
    parts.push(`Fitness ${Math.round(fitness)}`);
  }
  return parts.join(" · ");
}

// Today's value for each metric, falling back to the most recent day that has
// one (weight and VO2 max aren't recorded daily).
function latestHealthValues(health: HealthMetricsResponse) {
  const days = [...health.days].sort((a, b) => b.date.localeCompare(a.date));
  return HEALTH_TILES.flatMap((tile) => {
    const day = days.find((d) => d.values[tile.key] !== undefined);
    return day
      ? [{ ...tile, value: day.values[tile.key], date: day.date }]
      : [];
  });
}

export default function Command() {
  const today = toLocalDateString(new Date());

  const {
    isLoading: isLoadingStatus,
    data: status,
    error,
    revalidate: revalidateStatus,
  } = useCachedPromise(() => getTrainingStatus());

  // Loaded separately so the status shows as soon as it arrives, and a health
  // failure doesn't take the whole view down with it.
  const {
    isLoading: isLoadingHealth,
    data: healthData,
    revalidate: revalidateHealth,
  } = useCachedPromise(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return getHealthMetrics({
      from: toLocalDateString(weekAgo),
      metrics: HEALTH_TILES.map((tile) => tile.key),
    });
  });

  const isLoading = isLoadingStatus || isLoadingHealth;
  const data = status ? { status } : undefined;
  function revalidate() {
    revalidateStatus();
    revalidateHealth();
  }

  useEffect(() => {
    if (status) {
      updateCommandMetadata({ subtitle: subtitleFor(status) });
    }
  }, [status]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load training status",
        message: error.message,
      });
    }
  }, [error]);

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in Shape"
        url="https://shapecalendar.com/today"
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  const readiness = data?.status.readiness;
  const load = data?.status.load;
  const projection = data?.status.projection;
  const health = healthData ? latestHealthValues(healthData) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter metrics">
      {error && !data ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load training status"
          description={error.message}
        />
      ) : null}

      {data ? (
        <List.Section
          title="Readiness"
          subtitle={
            readiness ? READINESS_BANDS[readiness.band].advice : undefined
          }
        >
          {readiness ? (
            <>
              <List.Item
                title="Readiness"
                icon={{
                  source: Icon.Bolt,
                  tintColor: READINESS_BANDS[readiness.band].color,
                }}
                accessories={[
                  {
                    tag: {
                      value: READINESS_BANDS[readiness.band].label,
                      color: READINESS_BANDS[readiness.band].color,
                    },
                  },
                  { text: `${readiness.score}%` },
                ]}
                actions={actions}
              />
              {readiness.drivers.map((driver) => (
                <List.Item
                  key={driver.key}
                  title={driver.label}
                  icon={{
                    source: Icon.Dot,
                    tintColor:
                      driver.z < -0.25 ? Color.Orange : Color.SecondaryText,
                  }}
                  accessories={[
                    {
                      text: {
                        value: formatDeviation(driver.z),
                        color:
                          driver.z < -0.25 ? Color.Orange : Color.SecondaryText,
                      },
                      tooltip: "Deviation from your baseline",
                    },
                    { text: formatDriverValue(driver) },
                  ]}
                  actions={actions}
                />
              ))}
            </>
          ) : (
            <List.Item
              title="Readiness"
              icon={Icon.Bolt}
              subtitle={
                data.status.readinessUnavailable
                  ? READINESS_UNAVAILABLE[data.status.readinessUnavailable]
                  : undefined
              }
              accessories={[{ text: "–" }]}
              actions={actions}
            />
          )}
        </List.Section>
      ) : null}

      {data ? (
        <List.Section
          title="Training Load"
          subtitle={load?.band ? LOAD_BANDS[load.band].verdict : undefined}
        >
          {load ? (
            <>
              <List.Item
                title="Training Load Balance"
                icon={{
                  source: Icon.Gauge,
                  tintColor: load.band
                    ? LOAD_BANDS[load.band].color
                    : Color.SecondaryText,
                }}
                subtitle={load.ratio === null ? "Building your base" : ""}
                accessories={
                  load.ratio !== null && load.band
                    ? [
                        {
                          tag: {
                            value: LOAD_BANDS[load.band].label,
                            color: LOAD_BANDS[load.band].color,
                          },
                        },
                        { text: load.ratio.toFixed(2) },
                      ]
                    : [{ text: "–" }]
                }
                actions={actions}
              />
              <List.Item
                title="Fitness"
                icon={{ source: Icon.LineChart, tintColor: Color.Blue }}
                accessories={[{ text: String(Math.round(load.fitness)) }]}
                actions={actions}
              />
              <List.Item
                title="Fatigue"
                icon={{ source: Icon.LineChart, tintColor: Color.Red }}
                accessories={[{ text: String(Math.round(load.fatigue)) }]}
                actions={actions}
              />
              <List.Item
                title="Form"
                icon={{ source: Icon.LineChart, tintColor: Color.Green }}
                accessories={[{ text: String(Math.round(load.form)) }]}
                actions={actions}
              />
              {projection ? (
                <List.Item
                  title="Planned Peak"
                  subtitle={LOAD_BANDS[bandForRatio(projection.ratio)].planned}
                  icon={{
                    source: Icon.Calendar,
                    tintColor: LOAD_BANDS[bandForRatio(projection.ratio)].color,
                  }}
                  accessories={[
                    { text: formatDate(projection.date) },
                    { text: projection.ratio.toFixed(2) },
                  ]}
                  actions={actions}
                />
              ) : null}
            </>
          ) : (
            <List.Item
              title="Training Load Balance"
              icon={Icon.Gauge}
              subtitle={
                data.status.loadUnavailable
                  ? LOAD_UNAVAILABLE[data.status.loadUnavailable]
                  : undefined
              }
              accessories={[{ text: "–" }]}
              actions={actions}
            />
          )}
        </List.Section>
      ) : null}

      {health.length > 0 ? (
        <List.Section title="Health">
          {health.map((tile) => (
            <List.Item
              key={tile.key}
              title={tile.label}
              icon={tile.icon}
              accessories={[
                ...(tile.date !== today
                  ? [{ text: formatDate(tile.date) }]
                  : []),
                { text: tile.format(tile.value) },
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
