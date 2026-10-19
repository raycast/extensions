import { showHUD } from "@raycast/api";
import { CHROME, frontChromeWindowId, littleWindowIds, osascript, windowIds } from "./chrome";

export default async function Command() {
  try {
    const id = await frontChromeWindowId();
    const little = await littleWindowIds();
    if (!id || !little.has(id)) return showHUD("Little Chrome window is not focused");

    const target = (await windowIds()).find((w) => w !== id && !little.has(w));
    await osascript(`tell application "${CHROME}"
      set src to window id ${id}
      set u to URL of active tab of src
      ${
        target
          ? `set dst to window id ${target}
      tell dst to make new tab with properties {URL:u}
      set index of dst to 1`
          : `set dst to make new window
      set URL of active tab of dst to u`
      }
      close src
      activate
    end tell`);
  } catch (e) {
    await showHUD(`Open in tab failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
