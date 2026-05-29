import type { TmuxPane } from "./tmux";

export type Direction = "left" | "right" | "up" | "down";

// Find the nearest pane in the given direction within the SAME window, matching
// tmux's own `select-pane -L/-R/-U/-D` selection: a candidate must lie strictly
// in that direction AND overlap on the perpendicular axis; among those, the
// closest one (largest/smallest facing edge) wins. Returns null when there is
// no such neighbor (e.g. the pane is already at that edge, or is alone).
export function findNeighbor(
  panes: TmuxPane[],
  pane: TmuxPane,
  dir: Direction,
): TmuxPane | null {
  const right = (p: TmuxPane) => p.left + p.width - 1;
  const bottom = (p: TmuxPane) => p.top + p.height - 1;

  const vOverlap = (q: TmuxPane) =>
    q.top <= bottom(pane) && bottom(q) >= pane.top;
  const hOverlap = (q: TmuxPane) =>
    q.left <= right(pane) && right(q) >= pane.left;

  const candidates = panes.filter(
    (q) => q.windowIndex === pane.windowIndex && q.id !== pane.id,
  );

  let best: TmuxPane | null = null;
  for (const q of candidates) {
    switch (dir) {
      case "left":
        if (right(q) < pane.left && vOverlap(q)) {
          if (!best || right(q) > right(best)) best = q;
        }
        break;
      case "right":
        if (q.left > right(pane) && vOverlap(q)) {
          if (!best || q.left < best.left) best = q;
        }
        break;
      case "up":
        if (bottom(q) < pane.top && hOverlap(q)) {
          if (!best || bottom(q) > bottom(best)) best = q;
        }
        break;
      case "down":
        if (q.top > bottom(pane) && hOverlap(q)) {
          if (!best || q.top < best.top) best = q;
        }
        break;
    }
  }
  return best;
}
