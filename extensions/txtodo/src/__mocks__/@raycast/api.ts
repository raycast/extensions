// Minimal stub for @raycast/api — used by Vitest only.
// Only exports that are needed by tested modules are defined here.

export const Color = {
  Red: "raycast-color-red",
  Orange: "raycast-color-orange",
  Blue: "raycast-color-blue",
  Green: "raycast-color-green",
  SecondaryText: "raycast-color-secondary-text",
} as const;

// Image is only used as a type in the tested code; the namespace stub is
// sufficient to satisfy runtime imports.
export const Image = {} as const;

export const Icon = {
  Circle: "raycast-icon-circle",
  CircleFilled: "raycast-icon-circle-filled",
  Checkmark: "raycast-icon-checkmark",
} as const;
