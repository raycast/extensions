import { launchCommand, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { getSettings, logGlass, reachedGoal } from "./match";
import { playCheer, popConfetti } from "./sound";

export default async function Hydrate() {
  const now = Date.now();
  const { hydrationGoal, playCheer: cheer } = getSettings();
  const glasses = await logGlass(now);
  const justHitGoal = reachedGoal(glasses, hydrationGoal);
  const goalReached = glasses >= hydrationGoal;

  // Keep this command's own root-search subtitle in sync with the count.
  await updateCommandMetadata({ subtitle: `${glasses}/${hydrationGoal} glasses today` });

  if (cheer) playCheer();
  if (justHitGoal) await popConfetti();

  await showHUD(
    justHitGoal
      ? `🏆🎉 GOAL! ${glasses}/${hydrationGoal} glasses — hydration goal reached!`
      : goalReached
        ? `🏆 Full time! ${glasses}/${hydrationGoal} glasses — goal reached`
        : `💧 Hydrated! ${glasses}/${hydrationGoal} glasses today`,
  );

  // Refresh the menu bar so the count updates immediately.
  try {
    await launchCommand({ name: "hydration-break", type: LaunchType.Background });
  } catch {
    // Menu bar command may not be enabled; ignore.
  }
}
