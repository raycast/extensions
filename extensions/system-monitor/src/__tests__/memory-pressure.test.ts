import { Color } from "@raycast/api";
import { describe, expect, it } from "vitest";

import { colorForMemoryPressure } from "../lib/memory-pressure";

describe("colorForMemoryPressure", () => {
  it("maps the kern.memorystatus_vm_pressure_level labels to health colors", () => {
    expect(colorForMemoryPressure("Normal")).toBe(Color.Green);
    expect(colorForMemoryPressure("Warning")).toBe(Color.Yellow);
    expect(colorForMemoryPressure("Urgent")).toBe(Color.Orange);
    expect(colorForMemoryPressure("Critical")).toBe(Color.Red);
  });

  it("returns null for unknown or missing levels so percent color applies", () => {
    expect(colorForMemoryPressure("Unknown")).toBeNull();
    expect(colorForMemoryPressure("-")).toBeNull();
    expect(colorForMemoryPressure(undefined)).toBeNull();
  });
});
