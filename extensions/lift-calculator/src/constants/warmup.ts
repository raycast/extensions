// constants/warmup.ts
import { Color } from "@raycast/api";
import type { WarmupScheme } from "../types/warmup";

export const WARMUP_SCHEMES: WarmupScheme[] = [
  { percentage: 0.5, reps: 5, color: Color.Green }, // First warmup: 50% x 5
  { percentage: 0.6, reps: 4, color: Color.Green }, // Second: 60% x 4
  { percentage: 0.7, reps: 3, color: Color.Yellow }, // Third: 70% x 3
  { percentage: 0.8, reps: 2, color: Color.Yellow }, // Fourth: 80% x 2
  { percentage: 0.9, reps: 1, color: Color.Orange }, // Last warmup: 90% x 1
  { percentage: 1.0, reps: 1, color: Color.Red }, // Working weight: 100% x 1
];

// Based on Prilepin's Chart principles
export const WARMUP_DESCRIPTIONS = {
  methodology: `## Warmup Methodology

This warmup scheme is based on principles from Prilepin's Chart, a fundamental tool in strength training. The progression gradually increases intensity while decreasing volume to optimally prepare for your working weight.

### Benefits
- Properly warms up muscles and CNS
- Practices movement pattern
- Prevents fatigue before working sets
- Gradually acclimates to heavier weights

### Application
Start with 50% of your working weight for 5 reps, then progressively increase weight while decreasing reps. This allows for:
- Movement pattern practice
- Neural preparation
- Minimal fatigue accumulation`,

  light: "50% intensity for movement pattern practice",
  medium: "60-70% for technical refinement",
  moderate: "70-80% for neural activation",
  heavy: "80-90% for final preparation",
  working: "Working weight - ready for performance",
};

export const WARMUP_RESOURCES = {
  LINKS: {
    SBS: "https://www.strongerbyscience.com/warm-up/",
    WIKI: "https://en.wikipedia.org/wiki/Strength_training",
  },
};
