export interface BaseWindow {
  id: number;
  pid: number;
  app: string;
  title: string;
  space: number;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export function sortWindows<T extends BaseWindow>(windows: T[]): T[] {
  return [...windows].sort((a, b) => {
    if (a.space !== b.space) {
      return a.space - b.space;
    }

    const aArea = {
      min: { x: a.frame.x, y: a.frame.y },
      max: { x: a.frame.x + a.frame.w, y: a.frame.y + a.frame.h },
    };
    const bArea = {
      min: { x: b.frame.x, y: b.frame.y },
      max: { x: b.frame.x + b.frame.w, y: b.frame.y + b.frame.h },
    };

    // calculate the overlap of the two windows
    const overlapY = Math.max(0, Math.min(aArea.max.y, bArea.max.y) - Math.max(aArea.min.y, bArea.min.y));
    const minHeight = Math.min(a.frame.h, b.frame.h);

    // if the overlap of the two windows is greater than 50% of the window height, consider them in the same row
    if (overlapY > minHeight * 0.5) {
      return aArea.min.x - bArea.min.x;
    }

    // otherwise, sort by the top edge
    return aArea.min.y - bArea.min.y;
  });
}
