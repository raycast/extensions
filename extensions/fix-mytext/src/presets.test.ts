import { describe, expect, it } from "vitest";
import { PRESETS, PresetId, getPreset } from "./presets";

describe("PRESETS", () => {
  it("keeps the expected preset IDs", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["grammar", "clarity", "professional", "casual", "concise"]);
  });

  it("looks up a preset by ID", () => {
    expect(getPreset("clarity")).toMatchObject({
      id: "clarity",
      title: "Improve Clarity",
    });
  });

  it("falls back to the first preset for an unknown ID", () => {
    expect(getPreset("unknown" as PresetId)).toBe(PRESETS[0]);
  });
});
