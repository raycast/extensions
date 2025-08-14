import { prepareVoiceSettings, validatePlaybackSpeed } from "./settings";

describe("prepareVoiceSettings", () => {
  it("should handle valid preference values", () => {
    const prefs: Preferences.SpeakSelected = {
      stability: "0.7",
      similarityBoost: "0.8",
      elevenLabsApiKey: "dummy",
      voiceId: "nPczCjzI2devNBz1zQrb",
      playbackSpeed: "1.00",
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
      playbackSpeed: "1.00",
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
      playbackSpeed: "1.00",
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
      playbackSpeed: "1.00",
    };

    const settings = prepareVoiceSettings(prefs);
    expect(settings.stability).toBe(0.5); // default value
    expect(settings.similarity_boost).toBe(0.75); // default value
  });
});

describe("validatePlaybackSpeed", () => {
  it("should handle valid speed values", () => {
    expect(validatePlaybackSpeed("1.0")).toBe("1.00");
    expect(validatePlaybackSpeed("1.5")).toBe("1.50");
    expect(validatePlaybackSpeed("0.75")).toBe("0.75");
  });

  it("should clamp values above 2.0", () => {
    expect(validatePlaybackSpeed("2.5")).toBe("2.00");
    expect(validatePlaybackSpeed("3.0")).toBe("2.00");
  });

  it("should clamp values below 0.5", () => {
    expect(validatePlaybackSpeed("0.25")).toBe("0.50");
    expect(validatePlaybackSpeed("0.1")).toBe("0.50");
  });

  it("should handle invalid speed values", () => {
    expect(validatePlaybackSpeed("invalid")).toBe("1.00");
    expect(validatePlaybackSpeed("fast")).toBe("1.00");
    expect(validatePlaybackSpeed("")).toBe("1.00");
  });
});
