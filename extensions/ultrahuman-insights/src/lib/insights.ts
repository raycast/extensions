import { Color } from "@raycast/api";
import { MetricName } from "./types";

export type Status = "excellent" | "good" | "fair" | "poor" | "neutral";

export interface Insight {
  status: Status;
  label: string;
  context: string;
  recommendation?: string;
  color: Color;
  emoji: string;
}

export function statusColor(s: Status): Color {
  switch (s) {
    case "excellent":
    case "good":
      return Color.Green;
    case "fair":
      return Color.Yellow;
    case "poor":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function statusEmoji(s: Status): string {
  switch (s) {
    case "excellent":
    case "good":
      return "🟢";
    case "fair":
      return "🟡";
    case "poor":
      return "🔴";
    default:
      return "⚪";
  }
}

/** Compute percent delta of `value` from the average of `series`.
 * Pass `excludeIndex` (typically `series.length - 1` for today) to exclude by
 * position rather than by value, avoiding false exclusions when two readings
 * happen to be equal. */
export function deltaVsAverage(
  value: number | undefined,
  series: Array<number | undefined>,
  excludeIndex?: number,
): { delta: number; pct: number; avg: number } | null {
  if (value == null) return null;
  const baseline = series
    .map((v, i) => ({ v, i }))
    .filter(({ v, i }) => v != null && i !== excludeIndex)
    .map(({ v }) => v as number);
  if (baseline.length < 2) return null;
  const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const delta = value - avg;
  const pct = avg === 0 ? 0 : (delta / avg) * 100;
  return { delta, pct, avg };
}

// ---------------------------------------------------------------------------
// Shared score thresholds
// ---------------------------------------------------------------------------

export const SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
} as const;

function scoreStatus(value: number): Status {
  if (value >= SCORE_THRESHOLDS.excellent) return "excellent";
  if (value >= SCORE_THRESHOLDS.good) return "good";
  if (value >= SCORE_THRESHOLDS.fair) return "fair";
  return "poor";
}

// ---------------------------------------------------------------------------
// Per-metric insight factory
// ---------------------------------------------------------------------------

function sleepScore(value: number): Insight {
  const status = scoreStatus(value);
  if (status === "excellent") {
    return {
      status,
      label: "Excellent",
      context:
        "Well-rested. Your body got the restorative sleep it needs to perform.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "good") {
    return {
      status,
      label: "Good",
      context: "Solid night. Your sleep quality is in the healthy range.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "fair") {
    return {
      status,
      label: "Below optimal",
      context: `Sleep quality was suboptimal — below the ${SCORE_THRESHOLDS.good}+ target. Some recovery may be incomplete.`,
      recommendation:
        "Try going to bed 30–60 min earlier tonight and limit screen time before sleep.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status,
    label: "Poor",
    context: `Well below the ${SCORE_THRESHOLDS.good}+ optimal range. Today is a recovery day — keep intensity low.`,
    recommendation:
      "Prioritize sleep tonight. Consider a light activity day and avoid caffeine after noon.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function recoveryIndex(value: number): Insight {
  const status = scoreStatus(value);
  if (status === "excellent") {
    return {
      status,
      label: "Excellent",
      context:
        "Your body has fully recovered and is primed for high-intensity effort.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "good") {
    return {
      status,
      label: "Good",
      context: "Good recovery. You're ready for a normal training day.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "fair") {
    return {
      status,
      label: "Moderate",
      context: "Partial recovery — your body hasn't fully bounced back yet.",
      recommendation:
        "Keep today's activity moderate. Prioritize nutrition and hydration.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status,
    label: "Poor",
    context: "Low recovery. Your body is under stress and needs rest.",
    recommendation:
      "Skip hard training today. Focus on sleep, light movement, and stress management.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function movementIndex(value: number): Insight {
  const status = scoreStatus(value);
  if (status === "excellent") {
    return {
      status,
      label: "Excellent",
      context:
        "You hit your movement goals. Great job staying active throughout the day.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "good") {
    return {
      status,
      label: "Good",
      context: "Good movement day — above the baseline target.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (status === "fair") {
    return {
      status,
      label: "Below target",
      context:
        "Movement was lower than ideal. Long sitting periods can affect metabolism and recovery.",
      recommendation: "Add a 20-min walk or set hourly movement reminders.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status,
    label: "Low",
    context:
      "Very little movement recorded. Sedentary days can compound fatigue and slow recovery.",
    recommendation:
      "Even a short walk can help. Aim for at least 30 min of light activity.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function sleepEfficiency(value: number): Insight {
  if (value >= 90) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Nearly all time in bed was spent asleep — your sleep quality is very high.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 85) {
    return {
      status: "good",
      label: "Good",
      context:
        "Good sleep efficiency. Most of your time in bed was productive sleep.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 75) {
    return {
      status: "fair",
      label: "Moderate",
      context:
        "Some time in bed wasn't actual sleep. This could be from restlessness or late-night wake-ups.",
      recommendation:
        "Avoid lying in bed awake — get up briefly if you can't sleep after 20 min.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Poor",
    context:
      "A significant portion of bed time wasn't sleep. Frequent wake-ups or difficulty falling asleep detected.",
    recommendation:
      "Review sleep hygiene: consistent bedtime, cool dark room, and limit alcohol.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function totalSleep(value: number): Insight {
  if (value >= 420 && value <= 540) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Right in the 7–9 hour sweet spot. Your body had ample time for full sleep cycling.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if ((value >= 360 && value < 420) || (value > 540 && value <= 600)) {
    const dir = value < 420 ? "slightly short" : "slightly long";
    return {
      status: "good",
      label: "Good",
      context: `Sleep duration is ${dir} of the optimal 7–9 hour window but still in the healthy range.`,
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 300) {
    return {
      status: "fair",
      label: "Below target",
      context:
        "Less than 6 hours of sleep. You may feel fatigued and cognitive performance could be affected.",
      recommendation:
        "Aim to add 30–60 min tonight. Small improvements accumulate quickly.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Very short",
    context:
      "Under 5 hours — well below the recommended minimum. Performance, mood, and recovery will all be impacted.",
    recommendation:
      "Make sleep the priority tonight. Avoid screens, alcohol, and late meals.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function remSleep(value: number): Insight {
  if (value >= 90) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Ample REM sleep — your brain had plenty of time for memory consolidation and emotional processing.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 60) {
    return {
      status: "good",
      label: "Good",
      context:
        "Healthy REM duration. REM supports learning, memory, and mood regulation.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 30) {
    return {
      status: "fair",
      label: "Low",
      context:
        "Below the ideal 90+ minutes of REM. You may feel mentally foggy or emotionally flat.",
      recommendation:
        "Alcohol and sleep aids can suppress REM — avoid them for a few nights.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Very low",
    context:
      "Very little REM sleep detected. REM deprivation impairs memory, focus, and emotional stability.",
    recommendation:
      "Aim for a consistent full night's sleep to allow natural REM cycling.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function deepSleep(value: number): Insight {
  if (value >= 60) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Excellent deep sleep. Your body had ample time for physical repair and growth hormone release.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 40) {
    return {
      status: "good",
      label: "Good",
      context:
        "Good deep sleep duration — supporting tissue repair and immune function.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 20) {
    return {
      status: "fair",
      label: "Below target",
      context:
        "Deep sleep was below optimal. Physical recovery and cellular repair may be incomplete.",
      recommendation:
        "Exercise earlier in the day and keep a consistent sleep schedule to boost deep sleep.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Very low",
    context:
      "Very little deep sleep. This stage is critical for physical recovery — your body may feel sore or fatigued.",
    recommendation:
      "Avoid caffeine after 2 pm and consider cooler bedroom temperatures.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function nightRhr(value: number): Insight {
  if (value < 60) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "A low resting heart rate indicates strong cardiovascular fitness and good parasympathetic tone.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value <= 69) {
    return {
      status: "good",
      label: "Good",
      context: "Normal resting heart rate in the healthy range.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value <= 79) {
    return {
      status: "fair",
      label: "Slightly elevated",
      context:
        "Slightly elevated. Common after late meals, alcohol, or insufficient sleep.",
      recommendation:
        "Check if you had a late meal, alcohol, or stress — these are common culprits.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Elevated",
    context:
      "Elevated resting heart rate suggests your body is under stress or not fully recovered.",
    recommendation:
      "Avoid stimulants, ensure adequate hydration, and prioritize sleep tonight.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function hr(value: number): Insight {
  if (value < 70) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Low resting heart rate indicating strong cardiovascular conditioning.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value <= 79) {
    return {
      status: "good",
      label: "Normal",
      context: "Heart rate is in the normal resting range.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value <= 89) {
    return {
      status: "fair",
      label: "Slightly high",
      context:
        "Slightly above the optimal resting range. Could be stress, caffeine, or dehydration.",
      recommendation:
        "Stay hydrated, reduce caffeine, and monitor over the next few days.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "High",
    context:
      "Elevated heart rate. This may signal stress, illness, dehydration, or overtraining.",
    recommendation:
      "Rest today. If consistently above 90, consider checking in with your doctor.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function hrv(value: number, series?: Array<number | undefined>): Insight {
  const s = series ?? [];
  const delta = deltaVsAverage(value, s, s.length - 1);

  if (!delta) {
    return {
      status: "neutral",
      label: "",
      context:
        "HRV varies day to day. Track your personal baseline over 1–2 weeks.",
      color: Color.SecondaryText,
      emoji: "⚪",
    };
  }

  const { pct } = delta;

  if (pct >= 15) {
    return {
      status: "excellent",
      label: "Above baseline",
      context: `HRV is significantly above your 7-day average — a positive sign of readiness and recovery.`,
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (pct > -15) {
    return {
      status: "good",
      label: "Within baseline",
      context:
        "HRV is within your normal range. Your nervous system is balanced.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  return {
    status: "poor",
    label: "Below baseline",
    context: `Significantly below your 7-day baseline — a stress signal. Prioritize sleep and avoid hard training today.`,
    recommendation:
      "Opt for light movement, good nutrition, and an early bedtime.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function vo2Max(value: number): Insight {
  if (value >= 57) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Elite-level aerobic capacity. Your cardiovascular fitness is in the top tier.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 51) {
    return {
      status: "good",
      label: "Good",
      context: "Above-average VO₂ Max — your aerobic base is solid.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 44) {
    return {
      status: "fair",
      label: "Average",
      context:
        "Average aerobic capacity for your age group. There is room to improve with consistent cardio.",
      recommendation:
        "Add 2–3 Zone 2 cardio sessions per week to build your aerobic base.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Below average",
    context:
      "Below average aerobic capacity. Regular cardiovascular training can improve this over time.",
    recommendation:
      "Start with 20–30 min of low-intensity steady-state cardio 3× per week.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function spo2(value: number): Insight {
  if (value >= 97) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "Optimal blood oxygen saturation. Your respiratory and circulatory systems are working well.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 95) {
    return {
      status: "good",
      label: "Normal",
      context: "Normal blood oxygen levels.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 93) {
    return {
      status: "fair",
      label: "Slightly low",
      context:
        "SpO₂ is marginally below the normal range. This could be from sleeping position or minor congestion.",
      recommendation:
        "If this persists below 94% regularly, consult a doctor to rule out sleep apnea.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Low",
    context:
      "SpO₂ is below the safe threshold. Readings consistently below 93% warrant medical attention.",
    recommendation:
      "Consult a doctor, especially if you experience shortness of breath or fatigue.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function steps(value: number): Insight {
  if (value >= 10000) {
    return {
      status: "excellent",
      label: "Goal reached",
      context:
        "10,000+ steps hit. You've met the widely-recommended daily movement target.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 7500) {
    return {
      status: "good",
      label: "Good",
      context: "Strong step count — above average and close to the 10K target.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 5000) {
    return {
      status: "fair",
      label: "Below target",
      context:
        "Below the 7,500+ healthy range. A short walk could make up the gap.",
      recommendation:
        "Aim for a 20-min walk to bring your total up toward 7,500.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Low",
    context:
      "Very low step count. Sedentary days compound over time and can affect metabolic health.",
    recommendation:
      "Set an hourly reminder to stand and move. Even 500 steps per hour adds up.",
    color: Color.Red,
    emoji: "🔴",
  };
}

function activeMinutes(value: number): Insight {
  if (value >= 60) {
    return {
      status: "excellent",
      label: "Excellent",
      context:
        "60+ active minutes meets the WHO daily physical activity recommendation.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 30) {
    return {
      status: "good",
      label: "Good",
      context:
        "Good activity level. You're meeting the minimum daily movement guidelines.",
      color: Color.Green,
      emoji: "🟢",
    };
  }
  if (value >= 15) {
    return {
      status: "fair",
      label: "Low",
      context:
        "Below the 30-minute daily target. More movement would benefit your metabolic and cardiovascular health.",
      recommendation: "Add a brisk 15-min walk to double your active time.",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }
  return {
    status: "poor",
    label: "Very low",
    context: "Very little active time recorded today.",
    recommendation:
      "Aim for at least 30 min of activity. A short walk or stretching session counts.",
    color: Color.Red,
    emoji: "🔴",
  };
}

/** Return an insight for a single metric reading. `series` is the optional 7-day history for trend comparisons. */
export function insightFor(
  metric: MetricName,
  value: number | undefined,
  series?: Array<number | undefined>,
): Insight {
  if (value == null) {
    return {
      status: "neutral",
      label: "",
      context: "",
      color: Color.SecondaryText,
      emoji: "⚪",
    };
  }

  switch (metric) {
    case "sleep_score":
      return sleepScore(value);
    case "recovery_index":
      return recoveryIndex(value);
    case "movement_index":
      return movementIndex(value);
    case "sleep_efficiency":
      return sleepEfficiency(value);
    case "total_sleep":
      return totalSleep(value);
    case "rem_sleep":
      return remSleep(value);
    case "deep_sleep":
      return deepSleep(value);
    case "night_rhr":
      return nightRhr(value);
    case "hr":
      return hr(value);
    case "hrv":
      return hrv(value, series);
    case "vo2_max":
      return vo2Max(value);
    case "spo2":
      return spo2(value);
    case "steps":
      return steps(value);
    case "active_minutes":
      return activeMinutes(value);
    default:
      return {
        status: "neutral",
        label: "",
        context: "",
        color: Color.SecondaryText,
        emoji: "⚪",
      };
  }
}
