/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { environment } from "@raycast/api";

/** Resolve SVG text colors against Raycast's current appearance. */
export function isDarkAppearance(): boolean {
  return environment.appearance === "dark";
}
