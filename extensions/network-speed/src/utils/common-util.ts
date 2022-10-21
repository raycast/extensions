import { randomInt } from "crypto";

const loadingStyles = [
  "loading/loading-circle.gif",
  "loading/loading-circle-filled.gif",
  "loading/loading-dot.gif",
  "loading/loading-graph.gif",
  "loading/loading-panel.gif",
  "loading/loading-rectangle.gif",
  "loading/loading-speed-blue.gif",
  "loading/loading-speed-red.gif",
];

export function getLoadingStyle(loadingStyle: number) {
  if (loadingStyle === -1) {
    const index = randomInt(0, loadingStyles.length);
    return loadingStyles[index];
  } else {
    return loadingStyles[loadingStyle];
  }
}
