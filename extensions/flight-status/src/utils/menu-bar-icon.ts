import { Color, Icon } from "@raycast/api";
import { FlightPhase } from "../types";

export interface MenuBarIcon {
  source: Icon;
  tintColor: Color;
}

/**
 * Return the appropriate menu bar icon and color for the current flight state.
 *
 * @param phase - Derived flight phase (null when no telemetry)
 * @param overrideStatus - FA override like "Diverted" or "Cancelled"
 * @param hasRoute - Whether route data is available
 * @param isExpired - Whether the landed timer has expired
 */
export function getMenuBarIcon(
  phase: FlightPhase | null,
  overrideStatus: string | null,
  hasRoute: boolean,
  isExpired: boolean,
): MenuBarIcon {
  // Override (Diverted/Cancelled) wins over the landed/expired timer so a
  // diversion isn't masked once the flight is considered expired.
  if (overrideStatus) {
    return { source: Icon.Airplane, tintColor: Color.Red };
  }

  if (isExpired) {
    return { source: Icon.AirplaneLanding, tintColor: Color.Purple };
  }

  if (!hasRoute || phase == null) {
    return { source: Icon.Airplane, tintColor: Color.SecondaryText };
  }

  switch (phase) {
    case FlightPhase.OnGround:
      return { source: Icon.AirplaneTakeoff, tintColor: Color.Yellow };
    case FlightPhase.Climbing:
      return { source: Icon.AirplaneTakeoff, tintColor: Color.Blue };
    case FlightPhase.Cruising:
      return { source: Icon.Airplane, tintColor: Color.Green };
    case FlightPhase.Descending:
      return { source: Icon.AirplaneLanding, tintColor: Color.Orange };
    case FlightPhase.Landed:
      return { source: Icon.AirplaneLanding, tintColor: Color.Purple };
  }
}
