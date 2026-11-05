import type { Tool } from "@raycast/api";
import { client } from "../lib/ghosthand-client";
import { runAiTask } from "../lib/ai-operations";

type Input = {
  /** Exact phoneId returned by list-iphones. Never pass a name or invent an ID. */
  phoneId: string;
  /** The user's explicit instruction, including requested constraints. Do not add unrequested actions. */
  instruction: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message:
    "Run this instruction on your iPhone? Ghosthand's hosted AI receives the instruction, screen context, and device information. Approve any sending, deletion, purchase, or other consequential action requested here. Completed actions cannot be undone by stopping the task.",
  info: [
    { name: "iPhone ID", value: input.phoneId },
    { name: "Instruction", value: input.instruction },
  ],
});

/** Execute one confirmed natural-language task using Ghosthand's hosted agent, with exclusive control and cleanup. */
export default async function tool(input: Input) {
  return runAiTask(client, input.phoneId, input.instruction);
}
