import { showHUD, updateCommandMetadata } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  await showHUD("Toggling Dumps");

  let isIntercepting = await Herd.Dumps.isInterceptingDumps();

  await Herd.Dumps.toggleIntercept();

  isIntercepting = await Herd.Dumps.isInterceptingDumps();
  await updateCommandMetadata({ subtitle: isIntercepting ? "Intercepting" : "Not intercepting" });
}
