import { describe, expect, it, vi } from "vitest";
import { getPreferenceValues } from "@raycast/api";
import { getPreferenceDefault } from "./manifest";
import { getTtsPreferences } from "./ttsPreferences";

describe("getTtsPreferences", () => {
  it("falls back to the preset when the ttsModel override is blank", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      geminiApiKey: "key-abc",
      ttsModelPreset: "gemini-2.5-flash-preview-tts",
      ttsModel: "  ",
    });
    expect(getTtsPreferences()).toEqual({
      geminiApiKey: "key-abc",
      model: "gemini-2.5-flash-preview-tts",
    });
  });

  it("falls back to the manifest default when both override and preset are blank", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      geminiApiKey: "key-abc",
      ttsModelPreset: "",
      ttsModel: "",
    });
    expect(getTtsPreferences()).toEqual({
      geminiApiKey: "key-abc",
      model: getPreferenceDefault("ttsModelPreset"),
    });
  });

  it("trims a non-empty ttsModel override", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      geminiApiKey: "key-abc",
      ttsModelPreset: "gemini-2.5-flash-preview-tts",
      ttsModel: "  custom-model  ",
    });
    expect(getTtsPreferences()).toEqual({
      geminiApiKey: "key-abc",
      model: "custom-model",
    });
  });
});
