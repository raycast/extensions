import { List, environment } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { PANE_WIDTH, accent, markdownImage, squaresSVG } from "./mint-visuals";
import { Progress, progressText } from "./use-progress";

/**
 * The row a long Mint request shows while it runs: a progress ring, the
 * percentage and files read, and the dropdown's bar of squares in the pane,
 * with anything worth looking at meanwhile underneath.
 */
export function ProgressRow({ title, progress, below }: { title: string; progress?: Progress; below?: string }) {
  const appearance = environment.appearance === "light" ? "light" : "dark";
  return (
    <List.Item
      icon={getProgressIcon(progress?.fraction ?? 0, accent(appearance))}
      title={title}
      accessories={[{ text: progressText(progress) }]}
      detail={<List.Item.Detail markdown={[progressMarkdown(title, progress), below].filter(Boolean).join("\n\n")} />}
    />
  );
}

/** The bar of squares for a request that is still running: the percentage, then the files read or where Mint is. */
export function progressMarkdown(title: string, progress: Progress | undefined): string {
  const appearance = environment.appearance === "light" ? "light" : "dark";
  const squares = squaresSVG({
    appearance,
    fraction: progress?.fraction ?? 0,
    title,
    // The count of files read when Mint states it; else where it is, so a
    // long step shows it is still moving even when the percentage holds.
    detail: progress?.files ? `${progress.files.toLocaleString("en-US")} files read` : phaseText(progress?.phase),
    estimated: progress?.estimated,
  });
  return markdownImage(squares.svg, PANE_WIDTH, squares.height);
}

/** Three dots that keep moving while a group waits for its answer. */
export function updatingDots(): string {
  return ".".repeat(1 + (Math.floor(Date.now() / 400) % 3));
}

/** Mint's phase line, without the trailing ellipsis and cut to fit beside the percentage. */
function phaseText(phase: string | undefined): string | undefined {
  if (!phase) return undefined;
  const line = phase.replace(/…/g, "").replace(/\s+/g, " ").trim();
  return line.length > 34 ? `${line.slice(0, 33)}…` : line;
}
