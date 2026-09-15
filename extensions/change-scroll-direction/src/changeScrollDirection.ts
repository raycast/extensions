import { closeMainWindow, showHUD } from "@raycast/api";
import { isNaturalScrollingOn, setNaturalScrolling } from "./scrollDirection";

export default async function main() {
  try {
    await closeMainWindow();

    const enable = !(await isNaturalScrollingOn());
    await setNaturalScrolling(enable);

    await showHUD(enable ? "Natural scrolling ON (trackpad)" : "Natural scrolling OFF (mouse)");
  } catch {
    await showHUD("Couldn't change scroll direction...");
  }
}
