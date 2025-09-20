// constants/max.ts
import { Color } from "@raycast/api";
import type { MaxScheme } from "../types/max";

// External resource links
export const MAX_RESOURCES = {
  LINKS: {
    WIKI: "https://en.wikipedia.org/wiki/One-repetition_maximum",
    EPLEY_FORMULA: "https://en.wikipedia.org/wiki/One-repetition_maximum#Epley_formula",
  },
} as const;

export const MAX_SCHEMES: MaxScheme[] = [
  { reps: 1, percentage: 1.0, tintColor: Color.Red, scheme: "low" },
  { reps: 3, percentage: 0.94, tintColor: Color.Orange, scheme: "low" },
  { reps: 5, percentage: 0.89, tintColor: Color.Yellow, scheme: "moderate" },
  { reps: 6, percentage: 0.86, tintColor: Color.Yellow, scheme: "moderate" },
  { reps: 10, percentage: 0.75, tintColor: Color.Green, scheme: "high" },
  { reps: 12, percentage: 0.71, tintColor: Color.Green, scheme: "high" },
  { reps: 15, percentage: 0.64, tintColor: Color.Green, scheme: "high" },
];

export const SCHEME_DESCRIPTIONS = {
  low: `## Low repetition scheme 

A low repetition scheme with heavy loads (1-5 repetitions per set with 80-100% of 1RM) optimizes **strength increases.**

This scheme is ideal for:
- Powerlifters
- Olympic weightlifters
- Athletes focusing on maximal strength`,

  moderate: `## Moderate repetition scheme 

A moderate repetition scheme with moderate loads (6-12 repetitions per set with 60-80% of 1RM) optimizes **hypertrophic gains.**

This scheme is ideal for:
- Bodybuilders
- Athletes seeking muscle growth
- General strength training`,

  high: `## High repetition scheme 

A high repetition scheme with light loads (15+ repetitions per set with loads below 60% of 1RM) optimizes **local muscular endurance improvements.**

This scheme is ideal for:
- Endurance athletes
- Circuit training
- Metabolic conditioning`,
};
