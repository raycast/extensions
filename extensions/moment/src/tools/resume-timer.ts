import type { Tool } from "@raycast/api";
import { resumeConfirmation } from "../lib/lines.ts";
import { runTool } from "../moment.ts";

export const confirmation: Tool.Confirmation<Record<string, never>> = async () => resumeConfirmation();

/** Resumes the paused focus session or break. Returns the running timer. */
export default async function tool() {
  return runTool("resumeTimer");
}
