/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

/** Narrow unknown values to plain objects; arrays and null are not records. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
