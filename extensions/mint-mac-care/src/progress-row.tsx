import { environment } from "@raycast/api";
import { PANE_WIDTH, markdownImage, scanProgressSVG } from "./mint-visuals";
import { Progress } from "./use-progress";

/**
 * A scan's pane while it runs: the forecast, marked estimated, with Mint's
 * own phase and count of files read underneath.
 */
export function progressMarkdown(title: string, progress: Progress | undefined): string {
  const appearance = environment.appearance === "light" ? "light" : "dark";
  const picture = scanProgressSVG({
    appearance,
    title,
    estimate: progress?.fraction ?? 0,
    phase: progress?.phase,
    files: progress?.files,
    // The working orb turns while Mint works: the pane is drawn again every tick.
    turn: (Date.now() / 1000) * 1.9,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height, progress?.phase ?? title);
}

/** Three dots that keep moving while a group waits for its answer. */
export function updatingDots(): string {
  return ".".repeat(1 + (Math.floor(Date.now() / 400) % 3));
}
