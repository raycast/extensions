import { describe, it, expect } from "vitest";
import {
  deriveFaOverrideStatus,
  deriveMenuBarDisplay,
} from "./menu-bar-display";
import { FlightAwareStatus, FlightPhase } from "../types";

function makeFa(overrides: Partial<FlightAwareStatus> = {}): FlightAwareStatus {
  return {
    estimatedOn: null,
    estimatedIn: null,
    status: null,
    diverted: false,
    progressPercent: null,
    gateDestination: null,
    terminalDestination: null,
    baggageClaim: null,
    ...overrides,
  };
}

const base = {
  faStatus: null as FlightAwareStatus | null,
  isExpired: false,
  isLoading: false,
  hasRoute: true,
  hasFlightState: true,
  phase: FlightPhase.Cruising as FlightPhase | null,
  etaFormatted: "~2h 15m" as string | null,
};

describe("deriveFaOverrideStatus", () => {
  it("returns Diverted when the diverted flag is set", () => {
    expect(deriveFaOverrideStatus(makeFa({ diverted: true }))).toBe("Diverted");
  });

  it("returns Cancelled for both spellings", () => {
    expect(deriveFaOverrideStatus(makeFa({ status: "Cancelled" }))).toBe(
      "Cancelled",
    );
    expect(deriveFaOverrideStatus(makeFa({ status: "Canceled" }))).toBe(
      "Cancelled",
    );
  });

  it("returns null for an active status or no FA data", () => {
    expect(deriveFaOverrideStatus(makeFa({ status: "En Route" }))).toBeNull();
    expect(deriveFaOverrideStatus(null)).toBeNull();
  });
});

describe("deriveMenuBarDisplay", () => {
  it("shows the phase and ETA for an airborne flight", () => {
    const d = deriveMenuBarDisplay({ ...base, phase: FlightPhase.Cruising });
    expect(d.statusText).toBe(FlightPhase.Cruising);
    expect(d.etaText).toBe("~2h 15m");
    expect(d.overrideStatus).toBeNull();
  });

  it("prioritizes an FA override over the expired timer, even while loading", () => {
    const d = deriveMenuBarDisplay({
      ...base,
      faStatus: makeFa({ diverted: true }),
      isExpired: true,
      isLoading: true,
    });
    expect(d.overrideStatus).toBe("Diverted");
    expect(d.statusText).toBe("Diverted");
  });

  it("shows Landed when expired (no override)", () => {
    const d = deriveMenuBarDisplay({ ...base, isExpired: true });
    expect(d.statusText).toBe("Landed");
    expect(d.etaText).toBeNull();
  });

  it("shows Route Not Found / Not Active once settled", () => {
    expect(deriveMenuBarDisplay({ ...base, hasRoute: false }).statusText).toBe(
      "Route Not Found",
    );
    expect(
      deriveMenuBarDisplay({ ...base, hasFlightState: false, phase: null })
        .statusText,
    ).toBe("Not Active");
  });

  it("suppresses the status word while loading (no override)", () => {
    const d = deriveMenuBarDisplay({ ...base, isLoading: true, phase: null });
    expect(d.statusText).toBeNull();
  });

  it("does not show an ETA next to a Not Active flight (null phase)", () => {
    const d = deriveMenuBarDisplay({
      ...base,
      hasFlightState: false,
      phase: null,
    });
    expect(d.statusText).toBe("Not Active");
    expect(d.etaText).toBeNull();
  });

  it("shows the ETA under an FA override even without telemetry", () => {
    const d = deriveMenuBarDisplay({
      ...base,
      faStatus: makeFa({ diverted: true }),
      hasFlightState: false,
      phase: null,
    });
    expect(d.etaText).toBe("~2h 15m");
  });

  it("hides the ETA while loading or expired", () => {
    expect(
      deriveMenuBarDisplay({ ...base, isLoading: true }).etaText,
    ).toBeNull();
    expect(
      deriveMenuBarDisplay({ ...base, isExpired: true }).etaText,
    ).toBeNull();
  });

  it("hides the ETA when on the ground", () => {
    const d = deriveMenuBarDisplay({ ...base, phase: FlightPhase.OnGround });
    expect(d.etaText).toBeNull();
  });
});
