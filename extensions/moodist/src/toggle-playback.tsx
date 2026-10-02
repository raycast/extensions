import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { togglePlayback } from "./player";

function sounds(count: number) {
  return `${count} sound${count === 1 ? "" : "s"}`;
}

export default async function Command() {
  try {
    const result = await togglePlayback();
    switch (result.action) {
      case "paused":
        await showHUD(`Paused ${sounds(result.count)}`);
        break;
      case "resumed":
        await showHUD(`Playing ${sounds(result.count)}`);
        break;
      case "empty":
        await showHUD("Nothing in the mix — open Mix Sounds to add some");
        break;
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  } catch (e) {
    await showFailureToast(e, { title: "Moodist" });
  }
}
