import type { Tool } from "@raycast/api";
import { executeInstruction } from "../lib/automation";
import { consumeInstructionPreview, getInstructionPreview } from "../lib/preview-store";
import { formatInstructionPreview } from "../lib/instruction-preview";

type Input = {
  /** Exact single-use previewId returned by roku-preview. Never invent or reuse an ID. */
  previewId: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ previewId }) => {
  const saved = await getInstructionPreview(previewId);
  return { message: formatInstructionPreview(saved.prepared).join("\n\n") };
};

/** Execute the exact saved preview once, after confirmation and current-plan revalidation. */
export default async function tool({ previewId }: Input) {
  const saved = await consumeInstructionPreview(previewId);
  return executeInstruction(saved.prepared);
}
