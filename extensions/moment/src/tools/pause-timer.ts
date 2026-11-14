import type { Tool } from "@raycast/api";
import { pauseConfirmation } from "../lib/lines.ts";
import { runTool } from "../moment.ts";

export const confirmation: Tool.Confirmation<Record<string, never>> = async () => pauseConfirmation();

/** Pauses the focus session or break in progress. Returns the paused timer. */
export default async function tool() {
  return runTool("pauseTimer");
}
