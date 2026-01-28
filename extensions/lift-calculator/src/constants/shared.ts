// constants/shared.ts

// Input validation ranges and patterns
export const VALIDATION = {
  WEIGHT: {
    MIN: 1,
    MAX: 1000,
    PATTERN: /^(\d+(?:\.\d+)?)\*(\d+)$/,
  },
  REPS: {
    MIN: 1,
    MAX: 100,
  },
  getWeightError: () => `Weight must be between ${VALIDATION.WEIGHT.MIN} and ${VALIDATION.WEIGHT.MAX}`,
  getRepsError: () => `Reps must be between ${VALIDATION.REPS.MIN} and ${VALIDATION.REPS.MAX}`,
} as const;

// Unit conversion factors
export const UNITS = {
  CONVERSION: {
    KG_TO_LBS: 2.20462,
    LBS_TO_KG: 0.453592,
  },
  PRECISION: {
    DISPLAY: 1, // For displaying weights to users
    CALC: 4, // For internal calculations
  },
  INCREMENTS: {
    KG: 2.5, // Standard kg plate increment
    LBS: 5, // Standard lbs plate increment
  },
} as const;

// Epley formula constants
export const EPLEY = {
  MULTIPLIER: 1,
  COEFFICIENT: 0.0333,
} as const;
