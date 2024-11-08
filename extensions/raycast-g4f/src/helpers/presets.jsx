import { Storage } from "../api/storage.js";

export class AIPreset {
  constructor({
    name = "",
    provider = undefined,
    webSearch = "off",
    creativity = "0.7",
    systemPrompt = "",
    isDefault = false,
  }) {
    this.name = name;
    this.provider = provider;
    this.webSearch = webSearch;
    this.creativity = creativity;
    this.systemPrompt = systemPrompt;
    this.isDefault = isDefault;
  }
}

export const getAIPresets = async () => {
  const retrieved = await Storage.read("AIPresets", "[]");
  return JSON.parse(retrieved).map((x) => new AIPreset(x));
};

export const setAIPresets = async (presets) => {
  if (presets) await Storage.write("AIPresets", JSON.stringify(presets));
};

export const getSubtitle = (preset) => {
  return `Provider: ${preset.provider} | ${
    preset.webSearch !== "off" ? `Web Search: ${preset.webSearch} |` : ""
  } ${preset.systemPrompt.slice(0, 50)}`;
};

export const getPreset = (presets, name) => {
  return presets.find((x) => x.name === name);
};
