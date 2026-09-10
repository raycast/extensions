import type { Command, Model } from "../type";
import { DEFAULT_MODEL } from "./model-defaults";

export function resolveCommandSettings(command: Command, base?: Model) {
  const independent = command.configurationMode === "independent";
  if (!independent && !base) {
    throw new Error(`The base model for “${command.name}” is missing. Edit the AI command to choose another model.`);
  }
  const inherited = base ?? DEFAULT_MODEL;
  return {
    option: independent || command.overrideModel ? command.model : inherited.option,
    temperature: independent || command.overrideTemperature ? command.temperature : inherited.temperature,
    prompt: independent || command.overridePrompt ? command.prompt : inherited.prompt,
    enableReasoningEffortChange:
      independent || command.overrideReasoning
        ? (command.enableReasoningEffortChange ?? false)
        : inherited.enableReasoningEffortChange,
    reasoningEffort:
      independent || command.overrideReasoning ? (command.reasoningEffort ?? "medium") : inherited.reasoningEffort,
    vision: independent || command.overrideVision ? (command.vision ?? false) : inherited.vision,
  };
}
