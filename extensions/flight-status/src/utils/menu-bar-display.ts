import { FlightAwareStatus, FlightPhase } from "../types";
import { isAirborne } from "./flight-phase";

export interface MenuBarDisplay {
  /** FA override to surface ("Diverted" / "Cancelled"), else null. */
  overrideStatus: string | null;
  /** Status word for the menu bar title, else null. */
  statusText: string | null;
  /** ETA string for the menu bar title, else null. */
  etaText: string | null;
}

/**
 * Interpret a FlightAware status into an override the raw telemetry can't
 * derive. Centralizes the "cancel" substring match (covers "Cancelled" and
 * "Canceled") and the diverted flag.
 */
export function deriveFaOverrideStatus(
  faStatus: FlightAwareStatus | null,
): string | null {
  if (faStatus?.diverted) return "Diverted";
  if ((faStatus?.status ?? "").toLowerCase().includes("cancel")) {
    return "Cancelled";
  }
  return null;
}

/**
 * Derive the menu bar display strings (override, status word, ETA) from the
 * current flight state. Pure and unit-testable — the component passes plain
 * flags/values and renders whatever this returns.
 *
 * Precedence for the status word: an FA override (shown even while loading, so
 * it stays consistent with the red icon) beats the expired/landed timer, which
 * beats the telemetry-derived states (only computed once a fetch has settled).
 * The ETA is shown only when not expired/loading and the flight is airborne or
 * under an FA override.
 *
 * @param etaFormatted - Pre-formatted ETA string (non-null iff an ETA exists),
 *   passed in so the caller formats it once and reuses it for the dropdown too.
 */
export function deriveMenuBarDisplay(params: {
  faStatus: FlightAwareStatus | null;
  isExpired: boolean;
  isLoading: boolean;
  hasRoute: boolean;
  hasFlightState: boolean;
  phase: FlightPhase | null;
  etaFormatted: string | null;
}): MenuBarDisplay {
  const {
    faStatus,
    isExpired,
    isLoading,
    hasRoute,
    hasFlightState,
    phase,
    etaFormatted,
  } = params;

  const overrideStatus = deriveFaOverrideStatus(faStatus);

  let statusText: string | null = null;
  if (overrideStatus) {
    statusText = overrideStatus;
  } else if (isExpired) {
    statusText = "Landed";
  } else if (!isLoading) {
    if (!hasRoute) {
      statusText = "Route Not Found";
    } else if (!hasFlightState) {
      statusText = "Not Active";
    } else if (phase) {
      statusText = phase;
    }
  }

  const showEta =
    etaFormatted != null &&
    !isExpired &&
    !isLoading &&
    (overrideStatus != null || isAirborne(phase));

  return {
    overrideStatus,
    statusText,
    etaText: showEta ? etaFormatted : null,
  };
}
