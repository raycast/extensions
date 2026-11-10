// Pure layout maths. No Raycast, no screen. Everything here can be tested with plain objects.

export type Frame = { x: number; y: number; width: number; height: number };

export type Size = { width: number; height: number };
/**
 * A window as the layouts see it. `fixed` can't resize at all. `min` is the size its app insists on,
 * learned by asking. `title` is only known for Raycast's own windows.
 */
export type Item = {
  id: string;
  frame: Frame;
  fixed?: Size;
  min?: Partial<Size>;
  active?: boolean;
  title?: string;
};

export type Placement = { id: string; frame: Frame };
export type Layout = (items: Item[], area: Frame) => Placement[];

/** Asked for first. Each app then clamps to the narrowest it allows. */
const SMALL_WIDTH = 240;

const centre = (i: Item) => ({
  x: i.frame.x + i.frame.width / 2,
  y: i.frame.y + i.frame.height / 2,
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const area = (f: Frame) => f.width * f.height;
/** Largest first. */
const bySize = (a: Item, b: Item) => area(b.frame) - area(a.frame);

/** Lay items left to right in one row. Fixed items keep their size, the rest share what is left. */
function row(items: Item[], box: Frame, gap: number): Placement[] {
  const wOf = (i: Item) => i.fixed?.width ?? i.min?.width;
  const flex = items.filter((i) => wOf(i) === undefined);
  const fixedW = sum(items.map((i) => wOf(i) ?? 0));
  const gaps = gap * Math.max(0, items.length - 1);
  const flexW = flex.length ? Math.max(0, (box.width - fixedW - gaps) / flex.length) : 0;
  const used = fixedW + flexW * flex.length + gaps;
  let x = box.x + (flex.length ? 0 : Math.max(0, (box.width - used) / 2));

  return items.map((i) => {
    const width = wOf(i) ?? flexW;
    const height = i.fixed?.height ?? i.min?.height ?? box.height;
    const y = box.y + Math.max(0, (box.height - height) / 2);
    const placement = { id: i.id, frame: { x, y, width, height } };
    x += width + gap;
    return placement;
  });
}

/** Stack items top to bottom. Each gets at least its minimum height, the rest share what is left. */
function column(items: Item[], box: Frame, gap: number): Placement[] {
  const minH = (i: Item) => i.fixed?.height ?? i.min?.height ?? 0;
  const free = box.height - gap * (items.length - 1);
  const flex = items.filter((i) => !minH(i));
  const share = flex.length ? Math.max(0, (free - sum(items.map(minH))) / flex.length) : 0;
  const extra = flex.length ? 0 : Math.max(0, (free - sum(items.map(minH))) / items.length);
  let y = box.y;
  return items.map((i) => {
    const height = i.fixed?.height ?? (minH(i) ? minH(i) + extra : share);
    const width = i.fixed?.width ?? box.width;
    const p = { id: i.id, frame: { x: box.x, y, width, height } };
    y += height + gap;
    return p;
  });
}

/** Split a box into `n` equal horizontal bands. */
function bands(box: Frame, n: number, gap: number): Frame[] {
  const height = (box.height - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, k) => ({
    ...box,
    y: box.y + k * (height + gap),
    height,
  }));
}

export const rows =
  (count = 2, gap = 0): Layout =>
  (items, box) => {
    if (!items.length) return [];
    // A window whose app won't go narrower than half the area can't share a row.
    // It takes a full-height column at its minimum width, and the rest tile in what is left.
    const minW = (i: Item) => i.fixed?.width ?? i.min?.width ?? 0;
    const wide = items.length > 1 ? items.filter((i) => !i.fixed && minW(i) > box.width / 2) : [];
    if (wide.length) {
      const rest = items.filter((i) => !wide.includes(i));
      const mid = box.x + box.width / 2;
      const onLeft = wide.filter((i) => centre(i).x < mid).sort((a, b) => centre(a).x - centre(b).x);
      const onRight = wide.filter((i) => centre(i).x >= mid).sort((a, b) => centre(a).x - centre(b).x);
      const cols: Placement[] = [];
      let x = box.x;
      for (const i of onLeft) {
        cols.push({
          id: i.id,
          frame: { x, y: box.y, width: minW(i), height: box.height },
        });
        x += minW(i) + gap;
      }
      let end = box.x + box.width;
      for (const i of [...onRight].reverse()) {
        end -= minW(i);
        cols.push({
          id: i.id,
          frame: { x: end, y: box.y, width: minW(i), height: box.height },
        });
        end -= gap;
      }
      const space = { ...box, x, width: Math.max(0, end - x) };
      return [...cols, ...(rest.length ? rows(count, gap)(rest, space) : [])];
    }
    // Up to three windows sit side by side. Four or more split into rows.
    const n = items.length < 4 ? 1 : Math.min(count, items.length);
    const per = Math.ceil(items.length / n);
    // Keep rough positions: higher windows take the top row, then each row runs left to right
    const byY = [...items].sort((a, b) => centre(a).y - centre(b).y);
    return bands(box, n, gap).flatMap((band, k) =>
      row(
        byY.slice(k * per, (k + 1) * per).sort((a, b) => centre(a).x - centre(b).x),
        band,
        gap,
      ),
    );
  };

/** Every window fills the area. A window that can't resize is centred instead. */
const monocle: Layout = (items, box) => items.flatMap((i) => row([i], box, 0));

/**
 * The largest window fills one side. The rest shrink into a single stacked column on the other,
 * at `SMALL_WIDTH` or the width their app allows.
 */
export const focus =
  (opts: { mainOn: "left" | "right"; gap?: number }): Layout =>
  (items, box) => {
    if (items.length < 2) return monocle(items, box);
    const [main, ...smalls] = [...items].sort(bySize);
    smalls.sort((a, b) => centre(a).y - centre(b).y);
    const gap = opts.gap ?? 0;
    // Wrap into extra columns when the minimum heights don't fit in one
    const minH = (i: Item) => i.fixed?.height ?? i.min?.height ?? 0;
    const cols: Item[][] = [[]];
    let used = 0;
    for (const sm of smalls) {
      const h = minH(sm);
      const col = cols[cols.length - 1];
      if (col.length && used + gap + h > box.height) {
        cols.push([sm]);
        used = h;
      } else {
        col.push(sm);
        used += (col.length > 1 ? gap : 0) + h;
      }
    }
    const colW = cols.map((c) => Math.max(SMALL_WIDTH, ...c.map((i) => i.fixed?.width ?? i.min?.width ?? 0)));
    const stripW = sum(colW) + gap * (cols.length - 1);
    const mainW = box.width - stripW - gap;
    const mainX = opts.mainOn === "left" ? box.x : box.x + stripW + gap;
    let x = opts.mainOn === "left" ? box.x + mainW + gap : box.x;
    const small = cols.flatMap((c, k) => {
      const out = column(c, { x, y: box.y, width: colW[k], height: box.height }, gap);
      x += colW[k] + gap;
      return out;
    });
    return [
      {
        id: main.id,
        frame: { x: mainX, y: box.y, width: mainW, height: box.height },
      },
      ...small,
    ];
  };

/**
 * Pin one item full height down the right, then lay out the rest in what is left.
 * The pinned item is asked for `width` first, then keeps whatever its app insists on.
 */
export const sidebar =
  (isPinned: (i: Item) => boolean, width: number, rest: Layout, gap = 0): Layout =>
  (items, box) => {
    const pinned = items.find(isPinned);
    if (!pinned) return rest(items, box);
    const w = pinned.fixed?.width ?? pinned.min?.width ?? width;
    const left = { ...box, width: box.width - w - gap };
    const side = {
      x: box.x + left.width + gap,
      y: box.y,
      width: w,
      height: pinned.fixed?.height ?? box.height,
    };
    return [
      { id: pinned.id, frame: side },
      ...rest(
        items.filter((i) => i !== pinned),
        left,
      ),
    ];
  };

/** Reading order: top row first, then left to right. Windows whose tops are within 40pt share a row. */
const readingOrder = (a: Item, b: Item) =>
  Math.abs(a.frame.y - b.frame.y) > 40 ? a.frame.y - b.frame.y : a.frame.x - b.frame.x;

/** Each window takes the frame of its neighbour. Whatever the layout is, it stays. */
export const rotate =
  (step: 1 | -1): Layout =>
  (items) => {
    const sorted = [...items].sort(readingOrder);
    const n = sorted.length;
    return sorted.map((item, k) => ({
      id: item.id,
      frame: sorted[(k + step + n) % n].frame,
    }));
  };

/** The active window and the largest window trade places. */
export const swapMaster: Layout = (items) => {
  const master = [...items].sort(bySize)[0];
  const active = items.find((i) => i.active);
  if (!master || !active || active === master) return [];
  return [
    { id: active.id, frame: master.frame },
    { id: master.id, frame: active.frame },
  ];
};
