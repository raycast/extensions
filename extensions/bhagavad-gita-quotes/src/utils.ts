// Copyright © 2026 Sam Analytic Solutions
// All rights reserved.

import { Color } from "@raycast/api";

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export function getThemeColor(scheme: string): Color {
  switch (scheme) {
    case "red":
      return Color.Red;
    case "green":
      return Color.Green;
    case "orange":
      return Color.Orange;
    case "purple":
      return Color.Purple;
    case "blue":
    default:
      return Color.Blue;
  }
}
