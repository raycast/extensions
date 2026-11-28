import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverLocations } from "./locations";
import { confirmAndPurge, measure, outcomeMessage, outcomeTitle } from "./purge";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Measuring Adobe caches…" });
  try {
    const { locations, issues } = await discoverLocations();
    const skipped = issues.length
      ? `Skipped extra folders: ${issues.map((i) => `${i.input} (${i.reason})`).join("; ")}.`
      : undefined;
    const sized = await Promise.all(locations.map(async (l) => [l, await measure(l.targets)] as const));
    const nonEmpty = sized.filter(([, bytes]) => bytes > 0).map(([l]) => l);
    const sizes = new Map(sized.map(([l, bytes]) => [l.id, bytes]));

    if (!nonEmpty.length) {
      await toast.hide();
      if (skipped)
        await showToast({ style: Toast.Style.Failure, title: "Adobe caches are already empty", message: skipped });
      else await showHUD("Adobe caches are already empty");
      return;
    }

    await toast.hide();
    const outcome = await confirmAndPurge(nonEmpty, sizes, true);
    if (!outcome) return;

    const message = [outcomeMessage(outcome), skipped].filter(Boolean).join(" ") || undefined;
    if (outcome.failures.length || outcome.spaceHeldBack || outcome.usedTrash || skipped) {
      await showToast({
        style: outcome.failures.length || skipped ? Toast.Style.Failure : Toast.Style.Success,
        title: outcomeTitle(outcome),
        message,
      });
    } else {
      await showHUD(`🧹 ${outcomeTitle(outcome)} of Adobe caches`);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't purge Adobe caches" });
  }
}
