import { Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import { Preferences, ApiResponse, SummaryMetrics, Metric } from "./types";

export const API_URL = "https://partner.ultrahuman.com/api/v1/metrics";

export function useMetrics(preferences: Preferences, date: string) {
  const { data, isLoading, error } = useFetch<ApiResponse>(
    `${API_URL}?email=${encodeURIComponent(preferences.email)}&date=${date}`,
    {
      headers: {
        Authorization: preferences.apiKey,
      },
      onError: (error) => {
        if (error.message.includes("401")) {
          throw new Error("unauthorized");
        }
        showFailureToast(error, { title: "Failed to fetch metrics" });
      },
    }
  );

  return {
    data,
    isLoading,
    error,
    isUnauthorized: !isLoading && (error?.message === "unauthorized" || !data?.data?.metric_data),
  };
}

export function getStateColor(state: string | undefined): Color {
  if (!state) return Color.SecondaryText;

  switch (state.toLowerCase()) {
    case "optimal":
      return Color.Green;
    case "good":
    case "elevated":
      return Color.Yellow;
    case "needs attention":
    case "warning":
    case "poor":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function getMetricTitle(key: string): string {
  const titles: { [key: string]: string } = {
    efficiency: "Sleep Efficiency",
    temperature: "Temperature",
    restfulness: "Restfulness",
    consistency: "Consistency",
    totalSleep: "Total Sleep",
    hrDrop: "HR Drop",
    timing: "Timing",
    restoration: "Restoration Time",
    spo2: "SpO2",
    tossAndTurns: "Tosses & Turns",
    recovery: "Recovery",
    sleep: "Sleep",
    movement: "Movement",
    steps: "Steps",
    heartRate: "Heart Rate",
  };
  return titles[key] || key;
}

export function getMetricState(value: number): { state: string; color: Color } {
  if (value >= 80) {
    return { state: "Optimal", color: Color.Green };
  } else if (value >= 60) {
    return { state: "Good", color: Color.Yellow };
  } else {
    return { state: "Needs Attention", color: Color.Red };
  }
}

export function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) {
    return "Just now";
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  }
}

export function processSummaryMetrics(metricData: Metric[]): SummaryMetrics {
  const metrics: SummaryMetrics = {
    recovery: { value: 0, title: "Recovery" },
    sleep: { value: 0, title: "Sleep" },
    movement: { value: 0, title: "Movement" },
    steps: { value: 0, title: "Steps", total: 10000 },
    heartRate: { value: 0, title: "Heart Rate", unit: "BPM" },
  };

  if (!metricData?.length) {
    return metrics;
  }

  metricData.forEach((metric) => {
    const type = metric?.type?.toLowerCase();

    switch (type) {
      case "recovery_index":
        metrics.recovery.value = metric.object.value || 0;
        break;
      case "movement_index":
        metrics.movement.value = metric.object.value || 0;
        break;
      case "steps":
        metrics.steps.value = metric.object.total || 0;
        break;
      case "sleep":
        if (metric.object?.score_trend?.day_avg) {
          metrics.sleep.value = metric.object.score_trend.day_avg;
        }
        break;
      case "hr": {
        if (metric.object.last_reading !== undefined) {
          metrics.heartRate.value = metric.object.last_reading;
        }
        const values = metric.object.values;
        if (values?.length) {
          metrics.heartRate.lastUpdateTime = Math.max(...values.map((v) => v.timestamp));
        }
        break;
      }
    }
  });

  return metrics;
}
