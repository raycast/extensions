import { Color, Icon } from "@raycast/api";

import type { CompanyOfficer } from "./types";

/**
 * Where an officer stands on the register.
 *
 * Companies House reports three counts — `active_count`, `resigned_count` and
 * `inactive_count` — but flags nothing on the officer records themselves. The
 * members of a dissolved company are counted as *inactive*: they never
 * resigned, so they carry no `resigned_on`, and treating "no resignation date"
 * as "in post" reports the directors of a company dissolved fifteen years ago
 * as its current directors.
 *
 * Verified against the register: OC301341 reports 2 officers, 0 active, 0
 * resigned and 2 inactive, and neither officer has a `resigned_on`.
 */
export type OfficerStanding = "active" | "resigned" | "inactive";

export interface OfficerCounts {
  activeCount?: number;
  inactiveCount?: number;
}

export function officerStanding(
  officer: CompanyOfficer,
  counts: OfficerCounts,
): OfficerStanding {
  if (officer.resigned_on) return "resigned";
  // No officer is in post when the register says none is, so an officer
  // without a resignation date on such a company is inactive rather than
  // active. Companies House gives no way to tell them apart per officer, so
  // this is the only honest reading available.
  if ((counts.activeCount ?? 0) === 0 && (counts.inactiveCount ?? 0) > 0) {
    return "inactive";
  }
  return "active";
}

export function standingLabel(standing: OfficerStanding): string {
  switch (standing) {
    case "active":
      return "Active";
    case "resigned":
      return "Resigned";
    case "inactive":
      return "No Longer in Post";
  }
}

export function standingColor(standing: OfficerStanding): Color {
  switch (standing) {
    case "active":
      return Color.Green;
    case "resigned":
      return Color.SecondaryText;
    case "inactive":
      return Color.Orange;
  }
}

export function standingIcon(standing: OfficerStanding): Icon {
  switch (standing) {
    case "active":
      return Icon.CheckCircle;
    case "resigned":
      return Icon.XMarkCircle;
    case "inactive":
      return Icon.MinusCircle;
  }
}
