import { Action, type Tool } from "@raycast/api";
import { runTool } from "../moment.ts";

export const confirmation: Tool.Confirmation<Record<string, never>> = async () => ({
  style: Action.Style.Destructive,
  message: "End the focus session or break in progress?",
});

/** Ends the focus session or break in progress. Returns the timer at rest. */
export default async function tool() {
  return runTool("stopTimer");
}
