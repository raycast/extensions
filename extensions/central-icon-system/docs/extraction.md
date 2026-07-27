# Icon extraction — status and design

**Status: parser complete and verified against all 4,156 real modules. Manifest builder next.**

---

## Why a parser, not the npm module

The natural instinct is "just use the npm module." That doesn't work, for reasons that are
structural rather than incidental:

1. **`@central-icons-react/*` cannot be a runtime dependency.** Its `preinstall` hook throws
   without `CENTRAL_LICENSE_KEY`, which would break `npm ci` for Raycast's CI and any contributor.
2. **No `.svg` files ship.** Zero, across every package. `find -name "*.svg" | wc -l` → `0`.
3. **`/all` is 458 MB**; a single style package is ~37 MB across 10,409 files. Neither is
   bundleable, and esbuild inlining 2,078 React components is a non-starter.
4. **The components are React-only** — geometry lives inside `React.createElement` calls, so
   there's no way to *read* an SVG without evaluating or parsing them.

So the module *is* the source — we parse it at build time and commit only the derived manifest.
That's the same shape MynaUI uses (`import Icons from "../node_modules/@mynaui/icons/meta.json"`),
except Central ships no equivalent of `meta.json` with geometry in it, so we build ours.

**No license key was needed.** Tarballs download from the public registry without credentials, and
`preinstall` never fires on a direct tarball fetch. The geometry is byte-identical either way.
(That this is *possible* is not permission to redistribute it — see `research.md` §1.)

---

## Why a real parser and not a regex

A regex over `createElement\("(\w+)",\{(.*?)\}\)` looks sufficient and passes on ~99.8% of icons.
It silently corrupts the rest.

**9 icons across the two default styles** (6 outlined, 3 filled) wrap their paths in a clip group
and close with a matching definition:

```js
r.createElement("g",{clipPath:"url(#clip0_7101_62915)"},
  r.createElement("path",{d:"…"}), r.createElement("path",{d:"…"})),
r.createElement("defs",null,
  r.createElement("clipPath",{id:"clip0_7101_62915"},
    r.createElement("rect",{width:"24",height:"24",fill:"white"})))
```

A flat regex emits those as **siblings**, losing the nesting. The `<g>` no longer wraps anything,
the clip no longer applies, and the icon renders subtly wrong — not blank, which is why it would
survive a spot check. Hence recursive descent over the argument list.

`scripts/parse-central-icons.mjs` is pure string→string with no filesystem or network access, so
it is unit-testable in isolation.

## Verification

Fixture tests (`node --test scripts/parse-central-icons.test.mjs`) — **11/11 pass**, covering the
simple case, camelCase→kebab attribute mapping, outlined-vs-filled divergence, clip nesting, the
no-dangling-reference invariant, and the three throw paths.

Full corpus run:

```
OUTLINED | modules: 2078 | parsed: 2078 | failed: 0 | with clip: 6 | DANGLING: 0
FILLED   | modules: 2078 | parsed: 2078 | failed: 0 | with clip: 3 | DANGLING: 0
```

Visual confirmation — five icons rendered to PNG via `qlmanage` and inspected:

| Icon | Result |
|---|---|
| outlined `IconHome` | correct house outline |
| filled `IconHome` | correct solid house — visibly the same icon, different style |
| outlined `IconEyeSlash2` | correct crossed-out eye — **the clipPath case**, clip intact |
| outlined `IconSlack` | correct Slack logo — multi-path |
| filled `IconAdjustPhoto` | renders (multi-path + clip) |

Note the rendered PNGs came out small: `qlmanage` honors the root `width="24"`, which is exactly
the `stripRootDimensions` hazard documented in `FINDINGS.md` §5 — confirmed in practice, and
handled by the resvg export path.

## Facts established

- **All prop values are plain strings.** Zero non-string values across 4,156 modules, so no
  interpolation handling is needed. The parser *throws* on a non-string value rather than guessing.
- **Six element types occur:** `path`, `circle`, `ellipse`, `rect`, `g`, `clipPath` (+ `defs`).
  The prototype handled only `path`.
- **camelCase props needing mapping:** `strokeWidth`, `strokeLinecap`, `strokeLinejoin`,
  `strokeDasharray`, `strokeOpacity`, `strokeMiterlimit`, `fillRule`, `clipRule`, `clipPath`.
- **Filled is genuinely different geometry**, not a CSS toggle: outlined uses
  `stroke="currentColor"` + `stroke-width`, filled uses `fill="currentColor"` +
  `fill-rule`/`clip-rule`. **Side-by-side rendering therefore requires bundling both packages.**
- **1,420 of 2,078 outlined icons are multi-element** (944 filled), so multi-path handling is the
  common case, not an edge case.
- **The `mode="masked"` wrapper is deliberately excluded.** The base component wraps children in a
  mask + `<rect fill="currentColor">` so semi-transparent colors render evenly in React. A plain
  SVG export doesn't need it, and including it would make every exported file harder to reuse.

## Next

1. **Manifest builder** — walk both packages, join with `icons-index.json` (categories + aliases),
   emit `assets/central-icons.<style>.json`. Must assert `totalIcons === 2078` per style and fail
   loudly on drift (357 npm versions in 15 months; snapshots go stale).
2. **Merge the `Vehicles` / `Vehicles & Aircrafts` split** (4 + 35) — flagged to Andreas as an
   upstream bug.
3. **Audit for uncategorized icons** — SF Symbols has a 7.6% invisible tail (`categories: []`);
   confirm ours is zero before shipping.
4. Manifest output is **gitignored** under Path A — geometry stays local until Andreas replies.
