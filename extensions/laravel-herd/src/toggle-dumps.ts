import { showHUD, updateCommandMetadata } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showHUD("Toggling Dumps");

  let isIntercepting = await rescue(
    async () => Herd.Dumps.isInterceptingDumps(),
    "Failed to check if Dumps are intercepting.",
  );

  await rescue(async () => Herd.Dumps.toggleIntercept(), "Failed to toggle Dumps intercept.");

  isIntercepting = await rescue(
    async () => Herd.Dumps.isInterceptingDumps(),
    "Failed to check if Dumps are intercepting.",
  );
  await updateCommandMetadata({ subtitle: isIntercepting ? "Intercepting" : "Not intercepting" });
}
