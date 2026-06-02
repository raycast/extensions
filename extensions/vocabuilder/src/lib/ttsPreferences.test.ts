import { describe, expect, it, vi } from "vitest";
import { getPreferenceValues } from "@raycast/api";
import { getPreferenceDefault } from "./manifest";
import { getTtsPreferences } from "./ttsPreferences";

describe("getTtsPreferences", () => {
  it("uses extension-level preferences and manifest default when ttsModel is blank", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      geminiApiKey: "key-abc",
      ttsModel: "  ",
    });
    expect(getTtsPreferences()).toEqual({
      geminiApiKey: "key-abc",
      model: getPreferenceDefault("ttsModel"),
    });
  });

  it("trims a non-empty ttsModel override", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      geminiApiKey: "key-abc",
      ttsModel: "  custom-model  ",
    });
    expect(getTtsPreferences()).toEqual({
      geminiApiKey: "key-abc",
      model: "custom-model",
    });
  });
});
