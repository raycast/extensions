import { describe, it, expect } from "vitest";
import { MODEL_REGISTRY, getModel } from "../../src/lib/models";

describe("MODEL_REGISTRY", () => {
  it("contains parakeetTDT06 (current default)", () => {
    expect(MODEL_REGISTRY.find((m) => m.id === "parakeetTDT06")).toBeDefined();
  });

  it("contains both Whisper and cloud providers", () => {
    expect(MODEL_REGISTRY.some((m) => m.provider === "Whisper")).toBe(true);
    expect(MODEL_REGISTRY.some((m) => m.provider === "OpenAI")).toBe(true);
  });

  it("all entries have non-empty id and label", () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.id).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });

  it("cloud models are marked requiresAPIKey", () => {
    const cloud = MODEL_REGISTRY.filter((m) => !m.local);
    expect(cloud.length).toBeGreaterThan(0);
    expect(cloud.every((m) => m.requiresAPIKey)).toBe(true);
  });

  it("no duplicate ids", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getModel", () => {
  it("returns a registered model", () => {
    expect(getModel("parakeetTDT06")?.label).toContain("Parakeet");
  });

  it("returns undefined for unknown id (when no plist data adds it)", () => {
    // Note: this test relies on the user not having an unknown model in
    // `recentDictationModels`. If it ever fails, mock tryReadJSONPref.
    expect(getModel("completelyBogusModelIdXyz")).toBeUndefined();
  });
});
