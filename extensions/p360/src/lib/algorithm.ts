import { BiometricData, DecisionReadiness, ReadinessStatus } from "../types";

/**
 * Calculate decision readiness score based on Oura biometrics
 *
 * Algorithm (Simple v1):
 * - Primary: Oura Readiness Score (if available)
 * - Fallback: Sleep Score
 * - HRV Balance used as modifier
 *
 * Thresholds:
 * - >= 70: Excellent (green) - Great time for important decisions
 * - >= 50: Good (blue) - Good for most decisions
 * - >= 30: Caution (yellow) - Consider waiting for big decisions
 * - < 30: Poor (red) - Avoid major decisions
 */
export function calculateDecisionReadiness(
  data: BiometricData,
): DecisionReadiness {
  // Use readiness score if available, otherwise fall back to sleep score
  let baseScore = data.readinessScore ?? data.sleepScore ?? 50;

  // Apply HRV modifier (subtle adjustment)
  if (data.hrvBalance !== null) {
    // HRV balance is typically 0-100, center is around 50
    const hrvModifier = (data.hrvBalance - 50) * 0.1; // ±5 points max
    baseScore = Math.round(baseScore + hrvModifier);
  }

  // Clamp score between 0 and 100
  const score = Math.max(0, Math.min(100, baseScore));

  // Determine status
  const status = getStatusFromScore(score);

  return {
    score,
    status,
    message: getStatusMessage(status),
    recommendation: getRecommendation(status),
    metrics: {
      sleep: {
        value: data.sleepScore,
        label: getMetricLabel(data.sleepScore),
      },
      readiness: {
        value: data.readinessScore,
        label: getMetricLabel(data.readinessScore),
      },
      hrv: {
        value: data.hrvBalance,
        label: getHrvLabel(data.hrvBalance),
      },
    },
  };
}

function getStatusFromScore(score: number): ReadinessStatus {
  if (score >= 70) return "excellent";
  if (score >= 50) return "good";
  if (score >= 30) return "caution";
  return "poor";
}

function getStatusMessage(status: ReadinessStatus): string {
  const messages: Record<ReadinessStatus, string> = {
    excellent: "Great time for important decisions",
    good: "Good state for most decisions",
    caution: "Consider waiting for big decisions",
    poor: "Not recommended for major decisions",
  };
  return messages[status];
}

function getRecommendation(status: ReadinessStatus): string {
  const recommendations: Record<ReadinessStatus, string> = {
    excellent:
      "Your body is in optimal state. Perfect time for negotiations, important emails, or strategic planning.",
    good: "You're in a good state for everyday decisions. Proceed with confidence on routine matters.",
    caution:
      "Your readiness is below optimal. If possible, delay important decisions by a few hours or until tomorrow.",
    poor: "Your body signals suggest fatigue or stress. Avoid making significant commitments. Focus on recovery.",
  };
  return recommendations[status];
}

function getMetricLabel(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 50) return "Fair";
  return "Low";
}

function getHrvLabel(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 70) return "High";
  if (value >= 40) return "Normal";
  return "Low";
}

export function getStatusEmoji(status: ReadinessStatus): string {
  const emojis: Record<ReadinessStatus, string> = {
    excellent: "🟢",
    good: "🔵",
    caution: "🟡",
    poor: "🔴",
  };
  return emojis[status];
}

export function getStatusColor(status: ReadinessStatus): string {
  const colors: Record<ReadinessStatus, string> = {
    excellent: "#10B981", // Green
    good: "#3B82F6", // Blue
    caution: "#F59E0B", // Amber
    poor: "#EF4444", // Red
  };
  return colors[status];
}
