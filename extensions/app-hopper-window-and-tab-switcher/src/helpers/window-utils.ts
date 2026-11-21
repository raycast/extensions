export interface WindowState {
  space?: number;
  isMinimized?: boolean;
  isHidden?: boolean;
}

export interface BaseWindow extends WindowState {
  id: number;
  pid: number;
  app: string;
  title: string;
  space: number;
  /** CoreGraphics front-to-back position, used when app ordering is unavailable. */
  frontOrder?: number;
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

    const overlapY = Math.max(0, Math.min(aArea.max.y, bArea.max.y) - Math.max(aArea.min.y, bArea.min.y));
    const minHeight = Math.min(a.frame.h, b.frame.h);

    if (overlapY > minHeight * 0.5) {
      return aArea.min.x - bArea.min.x;
    }

    return aArea.min.y - bArea.min.y;
  });
}
