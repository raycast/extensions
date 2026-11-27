import { prepareInstruction } from "../lib/automation";
import { saveInstructionPreview } from "../lib/preview-store";
import { formatInstructionPreview } from "../lib/instruction-preview";

type Input = {
  /** Supported English command or exact saved routine name. Preserve the user's TV targeting; never invent a room for an unspecified target. */
  instruction: string;
  /** Exact saved device ID from roku-status. Every resolved action must target this TV. Create separate previews for multiple TVs. */
  deviceId: string;
};

/** Read and resolve an instruction without sending remote commands. Returns a single-use execution ID. */
export default async function tool(input: Input) {
  const prepared = await prepareInstruction(input.instruction);
  if (!prepared.plan.steps.length || prepared.plan.steps.some((step) => step.deviceId !== input.deviceId))
    throw new Error(
      "The instruction resolves to a different TV. Read Roku status and preserve the user's intended target.",
    );
  const saved = await saveInstructionPreview(prepared, input.deviceId);
  return {
    previewId: saved.previewId,
    deviceId: saved.deviceId,
    preview: formatInstructionPreview(saved.prepared),
    expiresAt: new Date(saved.expiresAt).toISOString(),
  };
}
