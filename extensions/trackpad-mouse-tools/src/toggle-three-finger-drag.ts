import { readDragStyle, setDragStyle } from "./lib/trackpad";
import { confirmChange, reportError } from "./lib/feedback";

export default async function Command() {
  try {
    const on = (await readDragStyle()) !== "three-finger";
    const applied = await setDragStyle(on ? "three-finger" : "off");
    await confirmChange(`Three Finger Drag: ${on ? "On" : "Off"}`, applied, true);
  } catch (e) {
    await reportError(e, true);
  }
}
