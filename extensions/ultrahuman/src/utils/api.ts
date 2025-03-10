import { Color } from "@raycast/api";
import { ApiResponse } from "./types";
import fetch from "node-fetch";

export const API_URL = "https://partner.ultrahuman.com/api/v1/metrics";

export async function fetchMetrics(email: string, apiKey: string, date?: string): Promise<ApiResponse> {
  const today = date || new Date().toISOString().split("T")[0];
  const response = await fetch(`${API_URL}?email=${email}&date=${today}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error("Network response was not ok");
  }

  const data = await response.json();

  if (!data.data?.metric_data) {
    throw new Error("unauthorized");
  }

  return data;
}

export function getStateColor(state: string): Color {
  if (!state) return Color.SecondaryText;

  switch (state.toLowerCase()) {
    case "optimal":
      return Color.Green;
    case "good":
      return Color.Yellow;
    case "elevated":
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
