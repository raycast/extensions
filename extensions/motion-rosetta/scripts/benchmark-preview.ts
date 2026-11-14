import { performance } from "node:perf_hooks";
import { COMPONENTS, previewDuration } from "../src/lib/preview.ts";
import {
  encodeRetinaPreview,
  RETINA_WIDTH,
  RETINA_HEIGHT,
} from "../src/lib/retina-preview.ts";
import { fromDuration } from "../src/lib/model.ts";

const easing = fromDuration(0.5, 0.6);
const duration = previewDuration(easing);
// Measure the same renderer and dimensions used by PreviewCache, not the
// historical 340×124 experiment. Native Raycast paint is not included.
console.log({
  width: RETINA_WIDTH,
  height: RETINA_HEIGHT,
  frames: 62,
  duration,
});
for (const appearance of ["dark", "light"] as const) {
  for (const component of COMPONENTS) {
    const start = performance.now();
    const bytes = encodeRetinaPreview(
      { easing, duration, component, appearance },
      "assets",
    );
    console.log({
      component,
      appearance,
      milliseconds: performance.now() - start,
      bytes: bytes.length,
    });
  }
}
