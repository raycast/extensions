import { runTool } from "../moment.ts";

/** Resumes the paused focus session or break. Returns the running timer. */
export default async function tool() {
  return runTool("resumeTimer");
}
