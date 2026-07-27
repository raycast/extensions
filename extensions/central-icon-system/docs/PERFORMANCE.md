# Performance

Raycast terminates a command that reaches a **100 MB JS heap**. This extension renders 4,156 grid
tiles over 4.4 MB of SVG geometry and rasterizes PNGs through WebAssembly, so that ceiling shaped
most of the non-obvious code. This document exists so the complexity reads as deliberate.

Every number here is measured on an M-series Mac, in a fresh Node process per run — reusing one
process measures accumulated garbage, not the thing under test.

---

## The floor

Before a single grid item exists:

| Component | RSS |
|---|---|
| Node baseline | 42 MB |
| + `@resvg/resvg-wasm` after `initWasm` | 59 MB |
| + both style manifests parsed as JSON | 94 MB |
| **Total before first render** | **101 MB** ← over the limit |

The extension crashed three times before this was measured. The first two fixes were correct and
insufficient, because the budget was already spent before any of the code they touched ran.

**The rule that would have saved all three: measure the floor before optimizing the ceiling.**

---

## 1. Metadata and geometry are separate files

4.4 MB of SVG strings cost **~26 MB resident** after `JSON.parse` — UTF-16, object overhead, and
parser garbage. Holding both styles put the floor over the limit on its own.

So each style ships as two files:

```
assets/central-icons.<style>.index.json   # names, categories, keywords, byte offsets — 0.26 MB
assets/central-icons.<style>.svg          # concatenated geometry — ~2 MB, never fully read
```

Only the index is resident. Geometry is read one icon at a time:

```ts
const [offset, length] = index.offsets[name];
const buffer = Buffer.allocUnsafe(length);
readSync(fd, buffer, 0, length, offset);
```

**A `name → svg` JSON map does not work here.** Parsing it to read one icon makes every icon
resident, which is the thing being avoided. The blob supports true random access — measured at
**~1 ms for 400 icons**, with flat memory.

Result: floor drops 101 MB → **75 MB**.

---

## 2. The grid renders at most 300 tiles

This is the constraint that actually governs survival, and it isn't about peak footprint — it's
about **re-render churn**. Each rendered tile holds a ~1.4 KB data URI, and every re-render
reallocates all of them. Allocation outruns collection.

Measured over 40 backdrop changes (a deliberately punishing loop):

| Tiles rendered | RSS after 40 changes |
|---|---|
| 4,156 | crash |
| 500 | 126 MB — still climbing |
| **300** | **93 MB — holds** |
| 200 | 92 MB |

Rendering all 4,156 walked RSS from 93 MB to 151 MB across just *four* backdrop changes. It still
climbed with the URI cache disabled and GC forced manually, which is what ruled out retention as
the cause.

A Small grid shows ~40 tiles at once, so 300 is an order of magnitude more than any viewport.

### The consequence: search is controlled, not native

Capping rendered tiles means filtering before the grid sees them — so `filtering={false}` and the
extension matches and ranks itself. That is normally the wrong call, and SF Symbols
[reverted exactly this change](https://github.com/raycast/extensions/pull/17319) for two stated
reasons. Both were measured before accepting the trade:

- **Performance.** Our filter runs in **~0.1 ms** over 4,156 tiles. Their problem was at 6,404 with
  a heavier implementation.
- **Relevance.** A naive `includes()` ranks by array position — searching `car` surfaces `menucard`
  first. `src/lib/search.ts` ranks exact → name-prefix → keyword-exact → keyword-prefix → substring,
  which restores correct ordering. There is a regression test asserting `car → IconCar1` and
  `bug → IconBug`.

Truncation is stated, never hidden: when matches exceed the cap the section reads
`showing 300 of 812`. Silently dropping results reads as "that icon doesn't exist."

---

## 3. Action panels are built for the selected tile only

Raycast displays the action panel of the highlighted item only, so building one per row is pure
waste — and not a small one. Each panel is ~40 nested elements (6 payload actions, 3 PNG size
submenus × 6 sizes, style submenus, backdrop, pin, clear):

| 4,156 grid items | Heap |
|---|---|
| with an eager `ActionPanel` each | **129 MB** |
| content only | 11 MB |
| `ActionPanel` on the selected item only | **9.6 MB** |

```tsx
const activeId = selectedId ?? firstId;   // nothing is selected until the user moves
actions={tile.id === activeId ? <IconActions … /> : undefined}
```

Rule of thumb: **heap ≈ items × panel-elements × ~780 bytes**. Every action added to the panel
multiplies across every rendered row unless it stays behind the selection check.

Two adjacent gotchas: `onSelectionChange` doesn't fire until the user moves, so the first item needs
a fallback or ↵ does nothing on launch; and nested submenus are where element counts explode.

---

## 4. WASM memory only grows

`@resvg/resvg-wasm` allocates in WebAssembly linear memory, which **never shrinks** and is
**invisible to the JS heap profiler**. During a leak that took RSS from 59 MB to 331 MB,
`heapUsed` reported a flat ~5 MB the whole time.

Two consequences:

**Every handle must be freed**, including the render output — easy to miss, since only the
constructor looks like an allocation:

```ts
let resvg: InstanceType<typeof Resvg> | undefined;
let rendered: ReturnType<InstanceType<typeof Resvg>["render"]> | undefined;
try {
  resvg = new Resvg(prepared, { fitTo: { mode: "width", value: size }, background: "rgba(0,0,0,0)" });
  rendered = resvg.render();
  return rendered.asPng();
} finally {
  rendered?.free();
  resvg?.free();
}
```

Measured over 200 renders: **331 MB unfreed vs 122 MB freed.** `src/lib/render.test.ts` asserts 150
renders grow RSS by under 100 MB — verified to fail without `free()` (+220 MB) and pass with it.

**Nothing is rasterized in batches.** Quick Look renders the selected tile on demand and caches to
disk. Pre-rendering on mount is correct at ~40 items (the `cursors` extension does exactly that) and
fatal at 4,156.

---

## 5. Two smaller things that matter

**Data URIs must be URL-encoded.** A raw `#` from a hex color starts a URL fragment and silently
truncates the SVG, so the tile renders blank:

```ts
`data:image/svg+xml,${encodeURIComponent(svg)}`
```

Base64 was measured as an alternative and is *not* smaller here (1.36× vs 1.33×).

**Root dimensions are stripped before rasterizing.** Central icons carry `width="24" height="24"`;
with those present resvg renders at 24px and upscales, so a 512px export is a blurry raster rather
than vector art.

---

## Checklist for future changes

- [ ] Measured RSS — not `heapUsed` — if the change touches WASM
- [ ] No work batched proportional to set size
- [ ] New actions stay behind the selection check
- [ ] Bulk payload stays out of the resident index
- [ ] Any new `Toast.Style.Failure` carries a Copy Error action
- [ ] A regression test that **fails without the fix**
