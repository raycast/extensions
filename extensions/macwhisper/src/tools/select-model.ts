import { Tool } from "@raycast/api";
import { listModels, selectModel } from "../lib/mw";

type Input = {
  /** Model id in `engine:model-id` form, exactly as returned by the list-models tool. */
  modelId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const models = await listModels();
  const current = models.find((model) => model.active);
  const next = models.find((model) => model.id === input.modelId);
  if (!next || next.active) return undefined;
  return {
    message: `Make ${next.name} MacWhisper's active transcription model?`,
    info: [
      { name: "Current", value: current ? `${current.name} (${current.id})` : undefined },
      { name: "New", value: `${next.name} (${next.id})` },
    ],
  };
};

/**
 * Changes MacWhisper's active transcription model. Only downloaded models can be selected.
 */
export default async function tool(input: Input) {
  const models = await listModels();
  const target = models.find((model) => model.id === input.modelId);
  if (!target) {
    const available = models.map((model) => `${model.name} (${model.id})`).join(", ");
    return `Model "${input.modelId}" is not downloaded. Available models: ${available || "none"}.`;
  }
  if (target.active) return `${target.name} is already the active model.`;
  await selectModel(target.id);
  return `${target.name} (${target.id}) is now MacWhisper's active model.`;
}
