// Pure layout maths. No Raycast, no screen. Everything here can be tested with plain objects.

export type Frame = { x: number; y: number; width: number; height: number };

export type Size = { width: number; height: number };
/**
 * A window as the layouts see it. `fixed` can't resize at all. `min` and `max` are the limits its app
 * has shown, learned by asking. `title` is only known for Raycast's own windows.
 */
export type Item = {
  id: string;
  frame: Frame;
  fixed?: Size;
  min?: Partial<Size>;
  max?: Partial<Size>;
  active?: boolean;
  title?: string;
  /** Marks the master, for a master layout, when it is known. Otherwise the layout picks one. */
  lead?: boolean;
};

/** Where a window goes. `screen` moves it to another screen, with `frame` in that screen's coordinates. */
export type Placement = { id: string; frame: Frame; screen?: number; master?: boolean };
/** Lays items out in an area. `screen` says which screen it is, for a layout that differs between them. */
export type Layout = (items: Item[], area: Frame, screen?: number) => Placement[];

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

type Axis = "width" | "height";

/** The size closest to `offered` that the item's app will take. */
const fit = (i: Item, axis: Axis, offered: number) =>
  i.fixed?.[axis] ?? Math.max(Math.min(offered, i.max?.[axis] ?? Infinity), i.min?.[axis] ?? 0);

/**
 * Share `total` along one axis. An item whose limits rule out the even share gets the nearest size it
 * allows, and the others share what is left.
 */
function split(items: Item[], axis: Axis, total: number, gap: number): number[] {
  const free = total - gap * Math.max(0, items.length - 1);
  const settled = new Map<Item, number>();
  for (;;) {
    const flex = items.filter((i) => !settled.has(i));
    const share = flex.length ? Math.max(0, (free - sum([...settled.values()])) / flex.length) : 0;
    const limited = flex.filter((i) => fit(i, axis, share) !== share);
    if (!limited.length) return items.map((i) => settled.get(i) ?? share);
    for (const i of limited) settled.set(i, fit(i, axis, share));
  }
}

/** Lay items left to right in one row, as tall as the row allows. Centred if their limits leave space over. */
function row(items: Item[], box: Frame, gap: number): Placement[] {
  const widths = split(items, "width", box.width, gap);
  const used = sum(widths) + gap * Math.max(0, items.length - 1);
  let x = box.x + Math.max(0, (box.width - used) / 2);
  return items.map((i, k) => {
    const height = fit(i, "height", box.height);
    const y = box.y + Math.max(0, (box.height - height) / 2);
    const placement = { id: i.id, frame: { x, y, width: widths[k], height } };
    x += widths[k] + gap;
    return placement;
  });
}

/** Stack items top to bottom, as wide as the column allows. */
function column(items: Item[], box: Frame, gap: number): Placement[] {
  const heights = split(items, "height", box.height, gap);
  let y = box.y;
  return items.map((i, k) => {
    const p = { id: i.id, frame: { x: box.x, y, width: fit(i, "width", box.width), height: heights[k] } };
    y += heights[k] + gap;
    return p;
  });
}

/**
 * Split a box into one horizontal band per group of items. Each band is at least as tall as the tallest
 * minimum in it, and the bands share the rest evenly, so a tall-minded window doesn't overlap the next row.
 */
function bands(box: Frame, groups: Item[][], gap: number): Frame[] {
  const asRows = groups.map((group, k) => ({
    id: String(k),
    frame: box,
    min: { height: Math.max(0, ...group.map((i) => i.fixed?.height ?? i.min?.height ?? 0)) },
  }));
  let y = box.y;
  return split(asRows, "height", box.height, gap).map((height) => {
    const band = { ...box, y, height };
    y += height + gap;
    return band;
  });
}

export const rows =
  (count = 2, gap = 0, from = 4): Layout =>
  (items, box) => {
    if (!items.length) return [];
    // A window whose app won't go narrower than half the area can't share a row.
    // It takes a full-height column at its minimum width, and the rest tile in what is left.
    const minW = (i: Item) => i.fixed?.width ?? i.min?.width ?? 0;
    const wide = items.length > 1 ? items.filter((i) => !i.fixed && minW(i) > box.width / 2) : [];
    // When those columns can't all fit side by side, each wide window takes a full-width row instead,
    // and the rest share one more row.
    const columnsW = sum(wide.map(minW)) + gap * Math.max(0, wide.length - 1);
    if (wide.length && columnsW > box.width) {
      const rest = items.filter((i) => !wide.includes(i));
      const groups = [...wide.map((i) => [i]), ...(rest.length ? [rest] : [])].sort(
        (a, b) => Math.min(...a.map((i) => centre(i).y)) - Math.min(...b.map((i) => centre(i).y)),
      );
      return bands(box, groups, gap).flatMap((band, k) =>
        row(
          [...groups[k]].sort((a, b) => centre(a).x - centre(b).x),
          band,
          gap,
        ),
      );
    }
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
      return [...cols, ...(rest.length ? rows(count, gap, from)(rest, space) : [])];
    }
    // Fewer than `from` windows sit side by side. More split into rows.
    const n = items.length < from ? 1 : Math.min(count, items.length);
    const per = Math.ceil(items.length / n);
    // Keep rough positions: higher windows take the top row, then each row runs left to right
    const byY = [...items].sort((a, b) => centre(a).y - centre(b).y);
    const groups = Array.from({ length: n }, (_, k) =>
      byY.slice(k * per, (k + 1) * per).sort((a, b) => centre(a).x - centre(b).x),
    );
    return bands(box, groups, gap).flatMap((band, k) => row(groups[k], band, gap));
  };

/** Every window fills the area. A window that can't resize is centred instead. */
const monocle: Layout = (items, box) => items.flatMap((i) => row([i], box, 0));

/** Hyprland's default share of the width for the master window. */
export const MASTER_RATIO = 0.55;

/** Split a stack into columns, starting a new one when the minimum heights don't fit. */
function wrap(stack: Item[], height: number, gap: number): Item[][] {
  const minH = (i: Item) => i.fixed?.height ?? i.min?.height ?? 0;
  const cols: Item[][] = [];
  let used = 0;
  for (const i of stack) {
    const col = cols[cols.length - 1];
    if (col && used + gap + minH(i) <= height) {
      col.push(i);
      used += gap + minH(i);
    } else {
      cols.push([i]);
      used = minH(i);
    }
  }
  return cols;
}

/**
 * Hyprland's master layout. The master is the focused window or the largest, and takes `ratio` of the width, on the left,
 * the right or in the middle. The rest stack in columns beside it: on the other side, or split across both
 * sides for "center". A stack that needs more room than its share gets it, and the master gives way.
 */
export const master =
  (opts: { side: "left" | "right" | "center"; ratio?: number; gap?: number; lead?: "focused" | "largest" }): Layout =>
  (items, box) => {
    if (items.length < 2) return monocle(items, box);
    const gap = opts.gap ?? 0;
    // The master is the focused window when asked, so you can pick it by working in it. Otherwise it is
    // the window marked as the master, and failing that the largest.
    const largest = [...items].sort(bySize);
    const main = (opts.lead === "focused" && items.find((i) => i.active)) || items.find((i) => i.lead) || largest[0];
    const stack = largest.filter((i) => i !== main);
    // Column by column, then top to bottom, so running the layout on its own result changes nothing
    stack.sort(columnOrder);
    const half = Math.ceil(stack.length / 2);
    const sides = opts.side === "center" && stack.length > 1 ? [stack.slice(0, half), stack.slice(half)] : [stack];
    const cols = sides.map((side) => wrap(side, box.height, gap));
    const need = (col: Item[]) => Math.max(SMALL_WIDTH, ...col.map((i) => i.fixed?.width ?? i.min?.width ?? 0));
    const sideNeed = cols.map((side) => sum(side.map(need)) + gap * (side.length - 1));
    const free = box.width - gap * sides.length;
    // The master takes its share unless the stack needs more, and never more than its app allows.
    // What it can't use goes to the stack, so no gap is left.
    const mainW = fit(main, "width", Math.min(free * (opts.ratio ?? MASTER_RATIO), free - sum(sideNeed)));
    // Each side gets an even share of what the master leaves, but never less than it needs
    const even = (free - mainW) / sides.length;
    const sideW = sides.length === 2 ? [Math.max(even, sideNeed[0]), 0] : [free - mainW];
    if (sides.length === 2) sideW[1] = free - mainW - sideW[0];

    const placeSide = (k: number, x: number) => {
      const extra = (sideW[k] - sideNeed[k]) / cols[k].length;
      return cols[k].flatMap((col) => {
        const width = need(col) + extra;
        const out = column(col, { x, y: box.y, width, height: box.height }, gap);
        x += width + gap;
        return out;
      });
    };
    const mainAt = (x: number): Placement => ({
      id: main.id,
      master: true,
      frame: { x, y: box.y, width: mainW, height: box.height },
    });
    switch (opts.side) {
      case "left":
        return [mainAt(box.x), ...placeSide(0, box.x + mainW + gap)];
      case "right":
        return [mainAt(box.x + sideW[0] + gap), ...placeSide(0, box.x)];
      case "center":
        if (sides.length === 1) return [mainAt(box.x), ...placeSide(0, box.x + mainW + gap)];
        return [
          ...placeSide(0, box.x),
          mainAt(box.x + sideW[0] + gap),
          ...placeSide(1, box.x + sideW[0] + gap + mainW + gap),
        ];
    }
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

/** Left column first, then top to bottom. Windows whose left edges are within 40pt share a column. */
function columnOrder(a: Item, b: Item) {
  return Math.abs(a.frame.x - b.frame.x) > 40 ? a.frame.x - b.frame.x : a.frame.y - b.frame.y;
}

/**
 * Orders frames clockwise around the middle of their bounding box, starting top-left, so a rotation goes
 * round the screen: across the top, down the right, back along the bottom and up the left.
 */
function clockwise(frames: Frame[]): (a: Frame, b: Frame) => number {
  const left = Math.min(...frames.map((f) => f.x));
  const top = Math.min(...frames.map((f) => f.y));
  const cx = (left + Math.max(...frames.map((f) => f.x + f.width))) / 2;
  const cy = (top + Math.max(...frames.map((f) => f.y + f.height))) / 2;
  // Screen y points down, so a growing angle turns clockwise. Count from top-left (-135°).
  const turn = (f: Frame) => {
    const a = Math.atan2(f.y + f.height / 2 - cy, f.x + f.width / 2 - cx) + (3 * Math.PI) / 4;
    return (a + 2 * Math.PI) % (2 * Math.PI);
  };
  return (a, b) => turn(a) - turn(b) || a.x - b.x;
}

/**
 * `layout`, with every window moved one slot clockwise (`step` 1) or anticlockwise (-1). The layout runs
 * once to find each window's slot, then again with each window standing in its neighbour's slot, so it
 * still sizes every window within its limits. Windows that `stay` keep their slot, like a pinned sidebar.
 */
export const rotated =
  (layout: Layout, step: 1 | -1, stay: (i: Item) => boolean = () => false): Layout =>
  (items, box) => {
    const placed = layout(items, box);
    const slots = new Map(placed.map((p) => [p.id, p.frame]));
    const moving = items.filter((i) => !stay(i)).map((i) => ({ id: i.id, frame: slots.get(i.id) ?? i.frame }));
    const order = clockwise(moving.map((m) => m.frame));
    moving.sort((a, b) => order(a.frame, b.frame));
    const n = moving.length;
    const moves = new Map(moving.map((m, k) => [m.id, moving[(k + step + n) % n].frame]));
    return reslot(layout, items, box, placed, moves);
  };

/**
 * Runs `layout` again with every window standing in its slot from `placed`, except those in `moves`, which
 * stand in the slot given. The layout still sizes each window within its limits.
 */
function reslot(layout: Layout, items: Item[], box: Frame, placed: Placement[], moves: Map<string, Frame>) {
  const slot = new Map(placed.map((p) => [p.id, p.frame]));
  // In a master layout, whichever window is moved into the master's slot is the master from then on.
  // It is told so, since its size alone may not say it: a master can be the smaller window.
  const master = placed.find((p) => p.master);
  const sameFrame = (a: Frame, b: Frame) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  const taker = master && [...moves].find(([, frame]) => sameFrame(frame, master.frame))?.[0];
  const lead = master && (taker ?? master.id);
  return layout(
    items.map((i) => ({
      ...i,
      frame: moves.get(i.id) ?? slot.get(i.id) ?? i.frame,
      lead: lead ? i.id === lead : i.lead,
    })),
    box,
  );
}

/**
 * Hyprland's swapnext: the active window trades slots with the next one round, clockwise, wrapping at the
 * end. It follows whatever the layout is, so two windows swap whether they sit side by side or stacked.
 */
export const swappedNext =
  (layout: Layout, stay: (i: Item) => boolean = () => false): Layout =>
  (items, box) => {
    const placed = layout(items, box);
    const moving = placed.filter((p) => !items.some((i) => i.id === p.id && stay(i)));
    const order = clockwise(moving.map((p) => p.frame));
    moving.sort((a, b) => order(a.frame, b.frame));
    const at = moving.findIndex((p) => items.some((i) => i.id === p.id && i.active));
    if (at === -1 || moving.length < 2) return placed;
    const from = moving[at];
    const to = moving[(at + 1) % moving.length];
    return reslot(
      layout,
      items,
      box,
      placed,
      new Map([
        [from.id, to.frame],
        [to.id, from.frame],
      ]),
    );
  };

/** Hyprland's swapwithmaster: the active window trades slots with whichever window has the biggest one. */
export const withMaster =
  (layout: Layout, stay: (i: Item) => boolean = () => false): Layout =>
  (items, box) => {
    const placed = layout(items, box);
    const active = items.find((i) => i.active && !stay(i));
    const from = placed.find((p) => p.id === active?.id)?.frame;
    // The master as the layout marks it. A layout without one counts its biggest slot as the master.
    const free = placed.filter((p) => !items.some((i) => i.id === p.id && stay(i)));
    const top = free.find((p) => p.master) ?? [...free].sort((a, b) => area(b.frame) - area(a.frame))[0];
    if (!active || !from || !top || top.id === active.id) return placed;
    return reslot(
      layout,
      items,
      box,
      placed,
      new Map([
        [active.id, top.frame],
        [top.id, from],
      ]),
    );
  };

const flip = (f: Frame): Frame => ({ x: f.y, y: f.x, width: f.height, height: f.width });
const flipSize = <T extends Partial<Size> | undefined>(s: T): T => (s && { width: s.height, height: s.width }) as T;

/** `layout` turned on its side, so rows become columns. Hyprland's togglesplit, for a whole layout. */
export const transposed =
  (layout: Layout): Layout =>
  (items, box) =>
    layout(
      items.map((i) => ({
        ...i,
        frame: flip(i.frame),
        fixed: flipSize(i.fixed),
        min: flipSize(i.min),
        max: flipSize(i.max),
      })),
      flip(box),
    ).map((p) => ({ ...p, frame: flip(p.frame) }));

/**
 * Where a window lands when it moves from one area to another, like a different display: the same relative
 * position and size, within the limits its app has shown, and kept inside the new area.
 */
export function carry(item: Item, from: Frame, to: Frame): Frame {
  const along = (axis: Axis, pos: "x" | "y") => {
    const scale = to[axis] / from[axis];
    const size = Math.min(fit(item, axis, item.frame[axis] * scale), to[axis]);
    const start = to[pos] + (item.frame[pos] - from[pos]) * scale;
    return { size, start: Math.min(Math.max(start, to[pos]), to[pos] + to[axis] - size) };
  };
  const h = along("width", "x");
  const v = along("height", "y");
  return { x: h.start, y: v.start, width: h.size, height: v.size };
}

/** Whether windows overlap each other or spill outside the box: they don't all fit. */
export function crowded(placed: Placement[], box: Frame): boolean {
  const outside = (f: Frame) =>
    f.x < box.x - 2 ||
    f.y < box.y - 2 ||
    f.x + f.width > box.x + box.width + 2 ||
    f.y + f.height > box.y + box.height + 2;
  const overlap = (a: Frame, b: Frame) =>
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2;
  return placed.some((p, k) => outside(p.frame) || placed.slice(k + 1).some((q) => overlap(p.frame, q.frame)));
}

/**
 * `layout`, for when there are more windows than the box can fit at sizes their apps accept. The smallest
 * windows are set aside until the rest fit, then share the largest slot exactly, like a Hyprland group, so
 * nothing is left half-covered. The active window and any that `keep` always get a slot of their own.
 */
export const stacking =
  (layout: Layout, keep: (i: Item) => boolean = () => false): Layout =>
  (items, box) => {
    const kept = [...items];
    const extra: Item[] = [];
    const own = (i: Item | undefined) => !!i && !i.active && !keep(i);
    // Whether a window can share a slot without spilling out of it
    const fitsIn = (i: Item, f: Frame) =>
      (i.fixed?.width ?? i.min?.width ?? 0) <= f.width + 2 && (i.fixed?.height ?? i.min?.height ?? 0) <= f.height + 2;
    const sharable = (p: Placement, from: Item[]) => own(from.find((k) => k.id === p.id));
    let placed = layout(kept, box);

    // First look for the most windows that can stay tiled while every window set aside still fits in one
    // of their slots. Only so many combinations are tried, and the greedy pass below covers the rest.
    const spare = kept.filter(own);
    const footprint = (i: Item) => (i.fixed?.width ?? i.min?.width ?? 0) * (i.fixed?.height ?? i.min?.height ?? 0);
    // The windows hardest to fit are set aside first
    const hardest = [...spare].sort((a, b) => footprint(b) - footprint(a) || area(b.frame) - area(a.frame));
    const choose = function* (from: Item[], n: number, start = 0): Generator<Item[]> {
      if (n === 0) yield [];
      else
        for (let k = start; k <= from.length - n; k++)
          for (const rest of choose(from, n - 1, k + 1)) yield [from[k], ...rest];
    };
    search: if (crowded(placed, box) && spare.length <= 10) {
      for (let n = 1; n < kept.length && n <= spare.length; n++) {
        for (const aside of choose(hardest, n)) {
          const rest = kept.filter((k) => !aside.includes(k));
          const out = layout(rest, box);
          if (crowded(out, box) || !aside.every((i) => out.some((p) => fitsIn(i, p.frame)))) continue;
          kept.splice(0, kept.length, ...rest);
          extra.push(...aside);
          placed = out;
          break search;
        }
      }
    }

    while (crowded(placed, box) && kept.length > 1) {
      // Best is the smallest window whose leaving lets the rest fit, and that fits a slot of theirs.
      // Failing that: one whose leaving lets the rest fit, one that fits a slot, or just the smallest.
      const spares = kept.filter(own).sort((a, b) => area(a.frame) - area(b.frame));
      const tried = spares.map((c) => {
        const rest = kept.filter((k) => k !== c);
        const out = layout(rest, box);
        return { c, frees: !crowded(out, box), shares: out.some((p) => sharable(p, rest) && fitsIn(c, p.frame)) };
      });
      const next = (
        tried.find((t) => t.frees && t.shares) ??
        tried.find((t) => t.frees) ??
        tried.find((t) => t.shares) ??
        tried[0]
      )?.c;
      if (!next) break;
      kept.splice(kept.indexOf(next), 1);
      extra.push(next);
      placed = layout(kept, box);
    }
    if (!extra.length) return placed;
    // Each set-aside window takes the largest slot it fits in: one of the others' if it can, the active
    // or pinned window's if it must. Only when it fits nowhere does it take the largest slot regardless.
    const bySize = [...placed].sort((a, b) => area(b.frame) - area(a.frame));
    const shared = bySize.filter((p) => sharable(p, kept));
    return [
      ...placed,
      ...extra.map((i) => {
        const slot = (
          shared.find((p) => fitsIn(i, p.frame)) ??
          bySize.find((p) => fitsIn(i, p.frame)) ??
          shared[0] ??
          bySize[0]
        ).frame;
        const width = Math.min(fit(i, "width", slot.width), box.width);
        const height = Math.min(fit(i, "height", slot.height), box.height);
        const x = Math.min(Math.max(slot.x, box.x), box.x + box.width - width);
        const y = Math.min(Math.max(slot.y, box.y), box.y + box.height - height);
        return { id: i.id, frame: { x, y, width, height } };
      }),
    ];
  };

/**
 * A stand-in frame that makes layouts treat a window as the `rank`-th: earlier ranks sit further left and
 * are larger, so rank 0 is the master and the first in reading order. Centres share one line, so rows
 * don't reorder them.
 */
export function ranked(rank: number): Frame {
  const size = Math.max(1, 100 - rank);
  return { x: rank * 200, y: -size / 2, width: size, height: size };
}

/**
 * How many of `count` windows each display should hold, in proportion to its size. They always add up
 * to `count`: leftovers go to the displays that were rounded down the most.
 */
export function shares(count: number, sizes: { width: number; height: number }[]): number[] {
  const total = sum(sizes.map((s) => s.width * s.height));
  const exact = sizes.map((s) => (count * s.width * s.height) / total);
  const out = exact.map(Math.floor);
  const byRemainder = exact.map((e, k) => ({ k, left: e - out[k] })).sort((a, b) => b.left - a.left);
  for (let n = count - sum(out), i = 0; n > 0; n--, i++) out[byRemainder[i % byRemainder.length].k]++;
  return out;
}

/** The shapes Auto Tile can take: windows in one line or a grid, either turned on its side. */
export type Pivot = { shape: "line" | "grid"; sideways: boolean };

/**
 * The next shape round for `count` windows. Three or more go from side by side, to two rows, to two
 * columns, and back. Two can only be side by side or stacked, since a grid of two is a line.
 */
export function nextPivot(now: Pivot, count: number): Pivot {
  const sideBySide: Pivot = { shape: "line", sideways: false };
  const isSideBySide = now.shape === "line" && !now.sideways;
  if (count < 3) return isSideBySide ? { shape: "line", sideways: true } : sideBySide;
  if (isSideBySide) return { shape: "grid", sideways: false };
  if (now.shape === "grid" && !now.sideways) return { shape: "grid", sideways: true };
  return sideBySide;
}

/** `layout`, told which windows are masters, so it keeps them however their sizes compare. */
export const leading =
  (layout: Layout, masters: Set<string>): Layout =>
  (items, box, screen) =>
    layout(
      items.map((i) => ({ ...i, lead: masters.has(i.id) })),
      box,
      screen,
    );
