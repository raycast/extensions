import { runTool } from "../moment.ts";

/** Pauses the focus session or break in progress. Returns the paused timer. */
export default async function tool() {
  return runTool("pauseTimer");
}
