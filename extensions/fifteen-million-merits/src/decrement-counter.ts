import { PopToRootType, showHUD } from "@raycast/api";
import { isEnabled, refreshMenuBar, syncFocusMode, updateCounter } from "./lib/storage";

export default async function Command() {
  await showHUD("decrementing AI agent count", {
    popToRootType: PopToRootType.Immediate,
  });

  const enabled = await isEnabled();
  if (!enabled) return;

  const { currentCount, newCount } = await updateCounter(-1);

  await syncFocusMode(currentCount, newCount);
  await refreshMenuBar();
}
