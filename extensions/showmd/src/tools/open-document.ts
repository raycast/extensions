import { open } from "@raycast/api";
import { getShowmdPrefs } from "../lib/raycast-glue";
import { openTarget, targetUrlAfterSpawn } from "../lib/showmd";

type Input = {
  /** Absolute path to the markdown file or folder to open */
  path: string;
};

export default async function tool(input: Input): Promise<string> {
  const prefs = getShowmdPrefs();
  const plan = await openTarget(input.path, prefs);

  if (plan.action === "url") {
    await open(plan.url);
    return `Opened ${input.path} in ShowMD`;
  }
  if (!plan.result.ok) {
    return `Could not open ${input.path}: ${plan.result.error || "showmd binary not found"}`;
  }

  const targetResult = await targetUrlAfterSpawn(
    input.path,
    prefs,
    plan.result,
  );
  if (!targetResult.running) {
    return `Could not open ${input.path}: ShowMD did not start in time`;
  }
  if (!targetResult.url) {
    return `Could not open ${input.path}: ShowMD could not open the target`;
  }
  await open(targetResult.url);
  return `Opened ${input.path} in ShowMD`;
}
