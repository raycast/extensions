# Mermaid to Image

A Raycast extension that converts Mermaid syntax from selected text or the clipboard into shareable PNG and SVG diagrams.

## Highlights

- Hybrid renderer: `beautiful-mermaid` for supported SVG diagrams, with `mermaid-cli` (`mmdc`) for compatibility fallback
- Experimental Ondine renderer: explicit SVG mode, or default-off Auto SVG/PNG for eligible diagrams in the manual command
- Selected text first, clipboard second
- Copy images directly to the macOS clipboard
- SVG output with a dedicated `Copy SVG Code` action
- ASCII preview item for supported `beautiful-mermaid` syntax
- Quick Look support for wide diagrams with `cmd+y`
- Raycast AI tool that uses hybrid rendering, copies an image to the clipboard, and opens the result in Preview

## Requirements

### No extra setup required for SVG generation

If you use:

- `Render Engine = Auto` or `Beautiful`
- `Output Format = SVG`
- Supported `beautiful-mermaid` syntax

the extension works without installing anything else.

For some SVG preview and `Copy Image` cases that need browser-backed raster fidelity, the extension may still ask to download a managed browser later. This mainly affects diagrams whose SVG output is known to render incorrectly through the macOS raster path, such as `sequenceDiagram`.

If you want to override the bundled `beautiful-mermaid`, the extension resolves sources in this order:

1. `Custom beautiful-mermaid Path`
2. Global npm install of `beautiful-mermaid`
3. Bundled dependency inside the extension

### Required for compatible rendering and fallback

The `mmdc` path handles compatible output, default PNG generation, and Auto fallback. It requires:

1. [Node.js](https://nodejs.org/) (`24.14.0` recommended for local development)
2. `mermaid-cli`
3. A compatible Chromium-based browser binary

```bash
npm install -g @mermaid-js/mermaid-cli
```

### Required for browser-backed previews and experimental Ondine

Browser-backed SVG preview and `Copy Image` use Chrome/Chromium directly; they do not themselves require a global `mmdc` or Node.js installation. Ondine is bundled and compiles SVG locally, but its preview/copy and opt-in Auto PNG still require a browser. Install the compatible requirements above as well to keep Auto's `mmdc` fallback available.

Browser resolution order is:

1. `PUPPETEER_EXECUTABLE_PATH`
2. `CHROME_PATH`
3. Installed macOS app binaries such as Google Chrome / Chromium / Chrome Canary
4. A managed browser downloaded by the extension into Raycast support storage

Safari is not supported for compatible rendering. The `mmdc` / Puppeteer path requires a Chromium-based browser such as Google Chrome, Chromium, Chrome Canary, or the managed `chrome-headless-shell` downloaded by the extension.

If no browser is available and your current request needs `mmdc` or browser-backed SVG rasterization, the manual command will show a setup screen and offer `Download Browser`. The managed browser stays local to the extension and is reused for future compatible renders and high-fidelity SVG preview/copy cases.

### Optional local override for `beautiful-mermaid`

If you want the extension to prefer your local installation instead of the bundled version:

```bash
npm install -g beautiful-mermaid
```

## Development

- Recommended local Node version: `24.14.0`; supported development versions are Node `24.14+` or `22.14+` within those major versions. Node 20 is no longer supported by the current toolchain.
- The repo includes `.nvmrc` and `package.json.engines` to make the supported Node range explicit.
- Odd-numbered Node releases such as `23.x` can trigger install-time engine warnings from the toolchain even when the extension code itself is fine.
- Keep working notes, comparison galleries, generated diagrams, and local worktree copies outside the submission directory. Reproduction scripts remain in `scripts/ondine-spike/`.
- `.gitignore` controls Git tracking, not the contents copied by every publishing CLI. Inspect a separate submission directory with an explicit file inventory; never publish directly from a development directory containing ignored working data.

```bash
nvm use
npm install
npm run dev
```

## How It Works

### Manual command

1. Select Mermaid code in any app, or copy Mermaid code to the clipboard.
2. Run `Mermaid to Image` in Raycast.
3. The command uses selected text when available, otherwise it falls back to the clipboard.
4. After rendering, you can:
   - `Copy Image`
   - `Copy SVG Code` for SVG output
   - `Save Image`
   - `Open in Default App`
   - Switch between `Image` and `ASCII` in the left sidebar when the Mermaid syntax is supported by `beautiful-mermaid`
   - `Quick Look` with `cmd+y` for wide diagrams
5. If the request needs compatible rendering or browser-backed SVG rasterization and no browser is available yet, the command explains why and lets you download a managed browser locally.

### AI tool

Use `@mermaid-to-image` in Raycast AI to generate a diagram from a description.

Current AI tool behavior:

- Uses `beautiful-mermaid` for supported Mermaid syntax and saves an `SVG`
- Rasterizes supported SVG output before copying it to the clipboard
- Falls back to `Compatible (mmdc)` and saves a `PNG` when the syntax is unsupported
- Copies the image to the clipboard
- Opens the result in Preview
- Does not use Ondine, even when `Use Ondine in Auto` is enabled
- Saves the file to `~/Downloads/MermaidDiagrams/`
- If compatible fallback or browser-backed SVG clipboard rasterization is needed and no browser is available yet, the AI tool instructs you to run the manual command once and approve `Download Browser`

The AI tool returns a short success message with a Preview link. It does not embed the image inline in chat.
Successful AI responses also include the actual renderer used: `Renderer: beautiful` or `Renderer: mmdc`.

## Preferences

- `Output Format`
  - `SVG` is the default and works best with `Auto (Hybrid)`
  - `PNG`
- `Render Engine`
  - `Auto (Hybrid)`: preserves Beautiful SVG routing and compatible fallback; the optional Ondine route is described below
  - `Beautiful`: forces `beautiful-mermaid` SVG output
  - `Compatible`: forces `mmdc`
  - `Ondine Experimental (SVG Only)`: forces Ondine SVG output, with no automatic fallback; PNG is rejected
- `Use Ondine in Auto`: default off; applies to the manual command only
  - Eligible diagrams outside the existing Beautiful families may use Ondine SVG or browser-backed PNG
  - Render failures fall back once to `mmdc`; source with embedded configuration bypasses Ondine
  - Does not change AI behavior or the existing Beautiful families' PNG route
- `Compatible Theme`: theme for `mmdc` rendering only
  - Applies when `mmdc` is the actual renderer, including compatible PNG and Auto/AI fallback
- `Beautiful Theme`: theme for Beautiful and Ondine
  - Beautiful uses its resolved runtime's themes; Ondine maps colors from the bundled palette only
  - A custom/global Beautiful installation does not override Ondine's runtime or palette
- `Custom beautiful-mermaid Path`: optional package root or direct ESM entry file to prefer over global/bundled resolution
- `Generation Timeout`: timeout for compatible rendering and the Ondine PNG browser subprocess
  - Not a deadline for synchronous Ondine WASM compilation or the entire Auto attempt
- `Compatible Scale`: raster scale for `mmdc`
  - Default is `4`
  - Applies only when `mmdc` is the actual renderer
  - Does not affect Beautiful SVG or Ondine; Ondine PNG uses 3× with a 4096 px longest-edge cap
- `Save Path`: default save location
- `Custom mmdc Path`: custom executable path if Raycast cannot find `mmdc`

## Hybrid Rendering Rules

- With `Use Ondine in Auto` off or unset, PNG uses `mmdc` and the existing Auto routes are unchanged
- With opt-in enabled, eligible non-Beautiful families try Ondine for SVG/PNG before `mmdc`; existing Beautiful families still use `mmdc` for PNG
- Auto conservatively bypasses Ondine for init directives or frontmatter in the original or cleaned source
- Explicit Ondine remains SVG-only and surfaces failures without fallback
- Copy/Save/Open failure after a successful render does not trigger another render or repeat the external action
- `AI tool` uses `beautiful-mermaid` for supported syntax and falls back to `mmdc` for unsupported syntax
- `Auto + SVG + supported syntax` tries `beautiful-mermaid` first
- If `beautiful-mermaid` fails in `Auto`, the extension falls back to `mmdc`
- `Beautiful` mode does not auto-fallback for unsupported syntax
- `mmdc` always uses a resolved browser path, preferring the user environment and otherwise a managed local browser
- Some supported SVG outputs still use browser-backed rasterization for faithful preview and `Copy Image`, based on the final SVG structure rather than Mermaid syntax alone

## Supported `beautiful-mermaid` Syntax

`beautiful-mermaid` is currently used for these Mermaid entry points:

- `graph`
- `flowchart`
- `stateDiagram`
- `stateDiagram-v2`
- `sequenceDiagram`
- `classDiagram`
- `erDiagram`
- `xychart-beta`

With the Ondine opt-in off, other families use compatible mode in `Auto`.

## Experimental Ondine Scope

Ondine is pinned to `0.0.3`. The manual command's Auto opt-in considers these additional entry points:

- `mindmap`, `timeline`, `journey`, `gantt`, `pie`, `gitGraph`
- `quadrantChart`, `sankey-beta`, `block-beta`, `packet-beta`
- `kanban`, `architecture-beta`, `requirementDiagram`, `C4Context`
- `radar-beta`, `treemap-beta`, `info`

This is an entry-point allowlist, not a promise of full Mermaid feature parity. Unsupported syntax or render failures fall back to `mmdc` in Auto. Use Compatible for the closest Mermaid CLI behavior.

Explicit Ondine also accepts supported Beautiful-family entry points, but always produces SVG and never falls back. Embedded theme settings may not be honored in explicit mode; the result warns about detected theme directives. Auto bypasses embedded configuration instead.

Ondine preview and `Copy Image` use browser-backed rasterization. Auto PNG uses the same browser path at 3×, capped at 4096 px on the longest edge. Very large diagrams are scaled down. Result metadata shows the actual renderer, package version, and theme. ASCII preview remains a separate Beautiful feature.

## SVG Notes

- SVG preview inside Raycast is rasterized for reliable display quality.
- Ondine and compatible `mmdc` SVG output use browser-backed preview/copy to avoid missing Chinese labels, incorrect fills, or missing lines in native SVG rasterization. The saved SVG and `Copy SVG Code` retain the SVG output.
- `Copy Image` for SVG copies a high-resolution image representation, not raw SVG text.
- Some SVGs, especially `sequenceDiagram`, use a browser-backed raster path because the macOS rasterizers drop arrowheads or other fidelity details.
- Some flowcharts with custom `linkStyle` arrow markers also use browser-backed rasterization because the macOS SVG rasterizers can drop the colored arrowheads while keeping the edge lines.
- Some `xychart-beta` line charts also use browser-backed rasterization because the macOS SVG rasterizers can drop the connecting lines while keeping the dots.
- `Copy SVG Code` is available when you need the original markup.
- Wide diagrams are easier to inspect with `Quick Look` (`cmd+y`).

## ASCII Preview Notes

- ASCII preview is available in the manual command result screen for Mermaid syntax supported by `beautiful-mermaid`.
- Select `Image` or `ASCII` from the left sidebar.
- The ASCII renderer uses pure ASCII characters, not Unicode box drawing characters.
- ASCII preview availability is based on the Mermaid syntax, not on whether the final image was rendered by `beautiful-mermaid` or `mmdc`.
- When no local `beautiful-mermaid` install is found, the extension falls back to the bundled version and shows a one-time notice with the bundled version number.

## Class Diagram Compatibility Note

`beautiful-mermaid` supports `classDiagram`, but some complex or legacy class member forms may render differently than `mmdc`.

If you need the most compatible class diagram rendering, use:

- `Render Engine = Compatible`, or
- `Render Engine = Auto` with `PNG`

## File Management

### Manual command

- Renders into temporary files under Raycast support storage
- Cleans up temporary files when the preview closes
- Cleans up stale temporary files on launch

### AI tool

- Saves generated diagrams permanently to `~/Downloads/MermaidDiagrams/`
- Uses `SVG` for supported hybrid output and `PNG` for compatibility fallback
- Keeps generated files for later reuse

## Release Checklist

Before publishing to the Raycast Store:

1. Review and commit the intended source changes yourself, then prepare a clean submission directory without development evidence, local worktrees, dependency folders, or `.DS_Store` files. Do not rely on `.gitignore` as a publishing filter.
2. Follow [Raycast's preparation requirements](https://developers.raycast.com/basics/prepare-an-extension-for-store), including the latest API requirement. Review API upgrades explicitly and regenerate `package-lock.json` with npm rather than editing it by hand.
3. Keep `README.md`, `CHANGELOG.md`, and manifest preferences aligned. Keep the newest changelog heading on `{PR_MERGE_DATE}` until merge. Keep the Ondine opt-in default off and the AI route unchanged.
4. Retain the [Ondine and Pele MIT notices](assets/ondine.LICENSE) when distributing their bundled code.
5. Replace outdated Store screenshots using Raycast Window Capture: 2000 × 1250 px PNG, one consistent background, no personal data or unrelated apps/commands. Put Store screenshots in `metadata/`, runtime files in `assets/`, and any README-linked images in top-level `media/`.
6. Run the checks below. A build validates distribution but does not publish:

   ```bash
   npm run verify
   node --test scripts/ondine-spike/phase-2-*.test.mjs
   ```

7. Test the distribution build in Raycast and record actual results:
   - Existing Beautiful SVG cases: flowchart, custom `linkStyle` arrows, sequence, and `xychart-beta` lines
   - Opt-in Auto SVG/PNG: Chinese mindmap and timeline in Light/Dark, with renderer/version/theme metadata
   - Real Copy Image/paste, Save/Open, off-switch, configuration bypass, and explicit Ondine PNG rejection
   - Missing-browser setup and retry; no automatic download from AI
   - AI Beautiful success and compatible fallback, unchanged with the Ondine preference enabled
8. Review the actual archive size and independently installed execution. [Publishing](https://developers.raycast.com/basics/publish-an-extension) is a separate action: `npm run publish` authenticates with GitHub and creates or updates a Store pull request. Do not use it as a local validation command.

## Examples

### Flowchart

```text
flowchart TD
  A[Start] --> B{Continue?}
  B -->|Yes| C[Do Work]
  C --> D[Done]
  B -->|No| E[Stop]
```

### Sequence Diagram

```text
sequenceDiagram
  participant User
  participant API
  participant DB
  User->>API: Request profile
  API->>DB: Query user
  DB-->>API: User data
  API-->>User: Response
```

### Class Diagram

```text
classDiagram
  class Animal {
    +String species
    +speak() void
  }
  class Dog {
    +bark() void
  }
  Animal <|-- Dog
```

## Troubleshooting

- `No input found`
  - Select Mermaid code in the frontmost app, or copy it to the clipboard first.
- `mermaid-cli not found`
  - Install it with `npm install -g @mermaid-js/mermaid-cli`, or set `Custom mmdc Path`.
- `Chrome/Chromium not found`
  - Run `Mermaid to Image`, then choose `Download Browser` from the setup screen.
  - Safari cannot be used for compatible rendering; `mmdc` requires a Chromium-based browser.
- `Sequence diagram preview or copy is missing arrows`
  - Update to the latest extension version. Sequence-style SVGs now use browser-backed rasterization instead of the macOS SVG raster path.
  - If prompted, approve `Download Browser` once from the manual command.
- `Flowchart linkStyle colors are present but arrowheads are missing`
  - Update to the latest extension version. Affected flowcharts now use browser-backed rasterization when custom link markers are emitted.
  - If prompted, approve `Download Browser` once from the manual command.
- `xychart-beta` line charts show only dots without connecting lines
  - Update to the latest extension version. Affected line charts now use browser-backed rasterization instead of the macOS SVG raster path.
  - If prompted, approve `Download Browser` once from the manual command.
- `Beautiful mode failed`
  - The syntax may not be supported by `beautiful-mermaid`. Switch to `Auto` or `Compatible`.
- `Selection failed`
  - Some apps do not expose selected text to Raycast. Clipboard fallback still works.

## Credits

- [`beautiful-mermaid`](https://github.com/lukilabs/beautiful-mermaid)
- [`@mermaid-js/mermaid-cli`](https://github.com/mermaid-js/mermaid-cli)
- [Ondine](https://github.com/wevm/ondine) and its [Pele](https://github.com/obsidianmd/pele) ported portions; see [MIT notices](assets/ondine.LICENSE)
- [Mermaid](https://mermaid.js.org/)

## License

MIT
