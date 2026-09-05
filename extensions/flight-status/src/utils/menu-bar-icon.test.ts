import { describe, it, expect } from "vitest";
import { FlightPhase } from "../types";
import { getMenuBarIcon } from "./menu-bar-icon";
import { Icon, Color } from "@raycast/api";

describe("getMenuBarIcon", () => {
  it("returns AirplaneTakeoff/Yellow for OnGround", () => {
    const icon = getMenuBarIcon(FlightPhase.OnGround, null, true, false);
    expect(icon).toEqual({
      source: Icon.AirplaneTakeoff,
      tintColor: Color.Yellow,
    });
  });

  it("returns AirplaneTakeoff/Blue for Climbing", () => {
    const icon = getMenuBarIcon(FlightPhase.Climbing, null, true, false);
    expect(icon).toEqual({
      source: Icon.AirplaneTakeoff,
      tintColor: Color.Blue,
    });
  });

  it("returns Airplane/Green for Cruising", () => {
    const icon = getMenuBarIcon(FlightPhase.Cruising, null, true, false);
    expect(icon).toEqual({ source: Icon.Airplane, tintColor: Color.Green });
  });

  it("returns AirplaneLanding/Orange for Descending", () => {
    const icon = getMenuBarIcon(FlightPhase.Descending, null, true, false);
    expect(icon).toEqual({
      source: Icon.AirplaneLanding,
      tintColor: Color.Orange,
    });
  });

  it("returns AirplaneLanding/Purple for Landed", () => {
    const icon = getMenuBarIcon(FlightPhase.Landed, null, true, false);
    expect(icon).toEqual({
      source: Icon.AirplaneLanding,
      tintColor: Color.Purple,
    });
  });

  it("returns AirplaneLanding/Purple when expired", () => {
    const icon = getMenuBarIcon(FlightPhase.Cruising, null, true, true);
    expect(icon).toEqual({
      source: Icon.AirplaneLanding,
      tintColor: Color.Purple,
    });
  });

  it("returns Airplane/Red for Diverted override", () => {
    const icon = getMenuBarIcon(FlightPhase.Cruising, "Diverted", true, false);
    expect(icon).toEqual({ source: Icon.Airplane, tintColor: Color.Red });
  });

  it("returns Airplane/Red for Cancelled override", () => {
    const icon = getMenuBarIcon(null, "Cancelled", true, false);
    expect(icon).toEqual({ source: Icon.Airplane, tintColor: Color.Red });
  });

  it("returns Airplane/SecondaryText when no route", () => {
    const icon = getMenuBarIcon(null, null, false, false);
    expect(icon).toEqual({
      source: Icon.Airplane,
      tintColor: Color.SecondaryText,
    });
  });

  it("returns Airplane/SecondaryText when no phase (not active)", () => {
    const icon = getMenuBarIcon(null, null, true, false);
    expect(icon).toEqual({
      source: Icon.Airplane,
      tintColor: Color.SecondaryText,
    });
  });

  it("prioritizes override status over expired (diversion isn't masked)", () => {
    const icon = getMenuBarIcon(FlightPhase.Cruising, "Diverted", true, true);
    expect(icon).toEqual({ source: Icon.Airplane, tintColor: Color.Red });
  });

  it("prioritizes override status over phase", () => {
    const icon = getMenuBarIcon(FlightPhase.Cruising, "Diverted", true, false);
    expect(icon).toEqual({ source: Icon.Airplane, tintColor: Color.Red });
  });
});
