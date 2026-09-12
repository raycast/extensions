import { List, Icon } from "@raycast/api";
import { Model } from "./types";
import { CAPABILITIES } from "./constants";

/**
 * Generate capability accessory icons for a model
 */
export function getCapabilityAccessories(model: Model): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (model.reasoning) {
    accessories.push({
      icon: { source: Icon.LightBulb, tintColor: CAPABILITIES.reasoning.color },
      tooltip: "Reasoning",
    });
  }
  if (model.modalities.input.includes("image")) {
    accessories.push({
      icon: { source: Icon.Image, tintColor: CAPABILITIES.vision.color },
      tooltip: "Vision",
    });
  }
  if (model.modalities.input.includes("audio") || model.modalities.output.includes("audio")) {
    accessories.push({
      icon: { source: Icon.Microphone, tintColor: CAPABILITIES.audio.color },
      tooltip: "Audio",
    });
  }
  if (model.tool_call) {
    accessories.push({
      icon: { source: Icon.Hammer, tintColor: CAPABILITIES.tool_call.color },
      tooltip: "Tool Calling",
    });
  }

  return accessories;
}

/**
 * Generate capability accessory icons for a provider (based on its models)
 */
export function getProviderCapabilityAccessories(models: Model[]): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  const hasReasoning = models.some((m) => m.reasoning);
  const hasVision = models.some((m) => m.modalities.input.includes("image"));
  const hasAudio = models.some((m) => m.modalities.input.includes("audio") || m.modalities.output.includes("audio"));
  const hasToolCall = models.some((m) => m.tool_call);

  if (hasReasoning) {
    accessories.push({
      icon: { source: Icon.LightBulb, tintColor: CAPABILITIES.reasoning.color },
      tooltip: "Has reasoning models",
    });
  }
  if (hasVision) {
    accessories.push({
      icon: { source: Icon.Image, tintColor: CAPABILITIES.vision.color },
      tooltip: "Has vision models",
    });
  }
  if (hasAudio) {
    accessories.push({
      icon: { source: Icon.Microphone, tintColor: CAPABILITIES.audio.color },
      tooltip: "Has audio models",
    });
  }
  if (hasToolCall) {
    accessories.push({
      icon: { source: Icon.Hammer, tintColor: CAPABILITIES.tool_call.color },
      tooltip: "Has tool-calling models",
    });
  }

  return accessories;
}
