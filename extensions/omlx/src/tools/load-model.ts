import { Tool } from "@raycast/api";
import { loadModel } from "../lib/omlx";

type Input = {
  /** The model ID to load into memory. Use list-models to find available model IDs. */
  modelId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Load model into memory?`,
  info: [{ name: "Model", value: input.modelId }],
});

export default async function (input: Input) {
  await loadModel(input.modelId);
  return {
    success: true,
    modelId: input.modelId,
    message: `${input.modelId} is now loading`,
  };
}
