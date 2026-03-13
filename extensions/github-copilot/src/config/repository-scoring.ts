export const SCORING_CONFIG = {
  RECENCY_MULTIPLIERS: [
    { maxDays: 7, multiplier: 3.0, label: "This week" },
    { maxDays: 30, multiplier: 2.0, label: "This month" },
    { maxDays: 90, multiplier: 1.5, label: "Last 3 months" },
    { maxDays: 365, multiplier: 1.0, label: "This year" },
  ],
  DEFAULT_MULTIPLIER: 0.5,
  NO_DATE_MULTIPLIER: 0.1,
  MIN_CONTRIBUTIONS_FOR_TEST_REPOS: 5,
} as const;
