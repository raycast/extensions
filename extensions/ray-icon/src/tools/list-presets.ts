import { PRESETS } from "../lib/settings";

/** The ray.so/icon presets. Pass `preset` (the index) to Create Icon, or use the colors as a starting point. */
export default function tool() {
  return PRESETS.map((preset, index) => ({ index, ...preset }));
}
