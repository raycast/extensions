import { prepareVoiceSettings } from "./settings";

describe("prepareVoiceSettings", () => {
  it("should handle valid preference values", () => {
    const prefs: Preferences.SpeakSelected = {
      stability: "0.7",
      similarityBoost: "0.8",
      elevenLabsApiKey: "dummy",
      voiceId: "nPczCjzI2devNBz1zQrb",
    };

    const settings = prepareVoiceSettings(prefs);
    expect(settings.stability).toBe(0.7);
    expect(settings.similarity_boost).toBe(0.8);
  });

  it("should clamp values above 1", () => {
    const prefs: Preferences.SpeakSelected = {
      stability: "1.5",
      similarityBoost: "2.0",
      elevenLabsApiKey: "dummy",
      voiceId: "nPczCjzI2devNBz1zQrb",
    };

    const settings = prepareVoiceSettings(prefs);
    expect(settings.stability).toBe(1.0);
    expect(settings.similarity_boost).toBe(1.0);
  });

  it("should clamp values below 0", () => {
    const prefs: Preferences.SpeakSelected = {
      stability: "-0.5",
      similarityBoost: "-1.0",
      elevenLabsApiKey: "dummy",
      voiceId: "nPczCjzI2devNBz1zQrb",
    };

    const settings = prepareVoiceSettings(prefs);
    expect(settings.stability).toBe(0.0);
    expect(settings.similarity_boost).toBe(0.0);
  });

  it("should handle invalid number strings", () => {
    const prefs: Preferences.SpeakSelected = {
      stability: "invalid",
      similarityBoost: "not a number",
      elevenLabsApiKey: "dummy",
      voiceId: "nPczCjzI2devNBz1zQrb",
    };

    const settings = prepareVoiceSettings(prefs);
    expect(settings.stability).toBe(0.5); // default value
    expect(settings.similarity_boost).toBe(0.75); // default value
  });
});
