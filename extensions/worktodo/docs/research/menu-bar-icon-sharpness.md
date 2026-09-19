# Menu-bar icon sharpness investigation

Date: 2026-09-19

## Observed symptom

In the user-supplied menu-bar screenshot, Worktodo's white icon has visibly softer outer edges and interior detail than the adjacent icons and its own task-count text. This supports investigating the custom image rendering path, although a screenshot alone cannot identify the exact rasterization stage.

## Initial implementation

- `src/menu-bar.tsx` supplies `worktodo-menu-bar-icon.svg` with `Color.PrimaryText` to `MenuBarExtra`.
- The menu-bar image is separate from the PNG extension icon in `package.json`.
- The SVG consists of a single solid black compound path on transparency. It contains no bitmap, blur filter, shadow, or opacity effect.
- Its intrinsic dimensions are 512 by 512, without an explicit `viewBox`. The outer shape spans coordinates 16 through 496. At a hypothetical 16-point rendering size, this maps to a 15-point silhouette with half-point margins. Actual status-item dimensions were not measured.
- The installed SVG under `~/.config/raycast/extensions/worktodo/assets/` is byte-for-byte identical to the repository asset. This excludes a different installed source file, but does not exclude an in-memory image cache.
- Installed Raycast reports version 2.4.1.0; the repository uses `@raycast/api` 2.2.0.
- The public `MenuBarExtra` and image types expose no output resolution or backing-scale setting. Tint changes nontransparent pixel colors; the API does not document a sharpness control.

## Initial assessment

The leading hypothesis is soft rasterization or resampling of the custom SVG on its way to the native status item. The small curved interior cutout is a secondary legibility concern, but does not by itself explain the soft outer boundary.

The 512-unit source and missing `viewBox` are candidates for a controlled comparison, not proven causes. Large vector coordinates are not inherently low resolution, and an SVG without a `viewBox` is not inherently invalid. There is no evidence yet that changing the tint would improve sharpness.

## Proposed comparison

Compare the following in the actual Raycast menu bar on the same display, preserving the shape and tint initially:

1. Current SVG as the baseline.
2. The same path with explicit `viewBox="0 0 512 512"` and menu-sized intrinsic dimensions.
3. A transparent PNG rendered from the same path at twice the measured logical icon size.
4. A built-in Raycast icon as a rendering-path control.

Use distinct asset filenames to avoid ambiguous cached results. Compare outer-edge sharpness before changing the interior design. If only the interior remains hard to read after the rendering issue is resolved, adjust its geometry for the measured menu-bar size.

Native A/B verification was not completed: the available Raycast UI capture exposed its search window, not the macOS status item.

## Implemented mitigation

After the user requested a fix, inspection of the installed Raycast image-render worker showed that its SVG parser falls back to the intrinsic width and height when `viewBox` is absent, and its drawing code scales the path to the destination canvas. This makes adding `viewBox` alone an insufficiently supported fix. The worker also supports drawing PNG bitmaps and applying the existing tint to their alpha mask. This is evidence about the installed renderer, not proof of which stage softened the original status icon.

- Added `assets/worktodo-menu-bar-template.png`, a transparent 32-by-32 black template rendered directly from the vector path, targeting a 16-point icon at 2x backing scale. The screenshot's approximately 30-pixel outer silhouette is consistent with the source's 480/512 content ratio on a 32-pixel canvas; the native logical size was not independently measured.
- Updated `MenuBarExtra` to load this PNG with the existing `Color.PrimaryText` tint. The distinct filename avoids reusing the old SVG asset's cache entry.
- Retained the editable SVG with explicit 16-by-16 intrinsic dimensions and `viewBox="0 0 512 512"`. Its path and silhouette are unchanged.
- Generated the PNG using Sharp 0.35.4 / librsvg 2.62.91 at density 144 (2x the SVG's 16-unit intrinsic size), with no intermediate large bitmap, resizing pass, or sharpening filter. No package dependency was added.

To regenerate with Sharp available, use:

```javascript
await sharp("assets/worktodo-menu-bar-icon.svg", { density: 144 })
  .png()
  .toFile("assets/worktodo-menu-bar-template.png");
```

The export was checked for 32-by-32 dimensions, black RGB channels, and an alpha channel containing transparent, opaque, and antialiased edge pixels. Native visual acceptance remains required; a successful build and refresh do not establish that the on-screen blur is resolved.

Validation: `npm run verify` passed formatting, lint, type checks, 205 tests across 23 files, and Raycast/MCP builds. A separate comparison confirmed unchanged SVG path data, byte-identical installed PNG data, and the installed menu-bar bundle referencing the new filename. Raycast's native UI reported `Refreshed menu bar item Worktodo Menu Bar` after invoking its refresh action. The status icon itself was not available in the capture; user visual confirmation is pending.

## Sources

- [Raycast Menu Bar Commands](https://developers.raycast.com/api-reference/menu-bar-commands)
- [Raycast Icons and Images](https://developers.raycast.com/api-reference/user-interface/icons-and-images)
- [Raycast API changelog](https://developers.raycast.com/misc/changelog): documents local asset caching and using new filenames to enforce updates.
- Local source, installed asset comparison, installed application version, and the user-supplied screenshot.
