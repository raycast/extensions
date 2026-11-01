import { showHUD } from "@raycast/api";
import { getLevel, setLevel as setBoseLevel } from "swift:../swift";

export type Level = "high" | "low" | "off";

export async function setLevel(level: Level | ((current: Level) => Level)) {
  try {
    const next = typeof level === "function" ? level((await getLevel()) as Level) : level;
    await setBoseLevel(next);
    await showHUD(`Noise cancelling: ${next}`);
  } catch (error) {
    await showHUD(`Bose: ${(error as Error).message}`);
  }
}
