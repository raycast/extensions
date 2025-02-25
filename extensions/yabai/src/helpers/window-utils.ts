export interface BaseWindow {
  id: number;
  pid: number;
  app: string;
  title: string;
  space: number;
  "stack-index"?: number;
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

    if (Math.abs(a.frame.y - b.frame.y) > 10) {
      return a.frame.y - b.frame.y;
    }

    return a.frame.x - b.frame.x;
  });
}
