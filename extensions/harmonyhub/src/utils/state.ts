/**
 * State conversion utilities
 * @module
 */

import type { Draft } from "immer";

import type { HarmonyDevice, HarmonyActivity } from "../types/core/harmony";

/**
 * Convert a readonly device to a mutable one for Immer
 */
export function toMutableDevice(device: HarmonyDevice): Draft<HarmonyDevice> {
  return device as Draft<HarmonyDevice>;
}

/**
 * Convert a readonly activity to a mutable one for Immer
 */
export function toMutableActivity(activity: HarmonyActivity): Draft<HarmonyActivity> {
  return activity as Draft<HarmonyActivity>;
}

/**
 * Convert a readonly array to a mutable one for Immer
 */
export function toMutableArray<T>(array: readonly T[]): Draft<T>[] {
  return array as Draft<T>[];
}
