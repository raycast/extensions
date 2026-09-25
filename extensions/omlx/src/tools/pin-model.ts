import { Tool } from "@raycast/api";
import { updateModelSettings } from "../lib/omlx";

type Input = {
  /** The model ID to pin or unpin. Use list-models to find model IDs. */
  modelId: string;
  /** Set to true to pin (keep in memory), false to unpin. */
  pin: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.pin ? `Pin model to memory?` : `Unpin model from memory?`,
  info: [{ name: "Model", value: input.modelId }],
});

export default async function (input: Input) {
  await updateModelSettings(input.modelId, { is_pinned: input.pin });
  return {
    success: true,
    modelId: input.modelId,
    pinned: input.pin,
    message: input.pin
      ? `${input.modelId} pinned`
      : `${input.modelId} unpinned`,
  };
}
