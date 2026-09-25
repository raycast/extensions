import { Tool } from "@raycast/api";
import { unloadModel } from "../lib/omlx";

type Input = {
  /** The model ID to eject from memory. Use list-models to find loaded model IDs. */
  modelId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Eject model from memory?`,
  info: [{ name: "Model", value: input.modelId }],
});

export default async function (input: Input) {
  await unloadModel(input.modelId);
  return {
    success: true,
    modelId: input.modelId,
    message: `${input.modelId} ejected`,
  };
}
