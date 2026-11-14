# Development

## Install from source

Install [Raycast](https://www.raycast.com/), Node.js 24 or newer with npm, and Apple's Command Line Tools (`xcode-select --install`) or Xcode. Then run:

```sh
git clone https://github.com/chenghsj/app-hopper.git
cd app-hopper
npm ci
npm run dev
```

This builds the native helpers and loads App Hopper into Raycast for local development. Open **App Hopper** and follow the permission steps in the [README](../README.md#usage).

GitHub release downloads contain the Firefox/Zen companion, not a packaged Raycast extension.

## Project layout

| Directory    | Contents                                                                   |
| ------------ | -------------------------------------------------------------------------- |
| `src/`       | Raycast commands, window search/focus, and browser adapters.               |
| `companion/` | Shared Firefox/Zen companion and Zen workspace bridge.                     |
| `assets/`    | Extension icon, Swift helper sources, and companion release configuration. |
| `scripts/`   | Native builds, packaging, verification, and local setup tools.             |
| `tests/`     | Regression tests and native/browser fixtures.                              |
| `docs/`      | Setup, compatibility, and release guides.                                  |

## Local checks

```sh
npm test
npm run typecheck
npm run build -- --environment dist
npm run lint
npm run verify:native
```

`npm run dev` and `npm run build` automatically prepare native helpers. They compile Apple Silicon and Intel slices, combine them into universal binaries, sign them for local use, and generate `assets/native/manifest.json`. Unchanged helpers are verified and reused.

`assets/native/` is the helper snapshot included for Store review and distribution. Keep its binaries and manifest in Git so a Store build does not depend on npm lifecycle hooks or a compiler on the user's Mac. Edit Swift sources, run `npm run build:native`, and commit the updated snapshot together. See [native helper provenance](native-helpers.md).

### Review map

- `src/app-hopper.tsx` renders the root list and handles runtime readiness. `use-application-search.ts` owns the application search query, arrangement, selection, held result positions, and refresh resets. `app-groups.ts` owns arrangements; `app-row.ts` resolves application row evidence into one navigation target.
- `app-list-item.tsx` and `search-result-item.tsx` render those targets. `window-actions.tsx` owns focus, missing-target recovery, and refresh actions.
- `app-window-evidence.ts` owns source coverage, browser navigation evidence, mixed native/AX search targets, and incomplete Space observations. Rows, arrangements and search retain their own presentation and ranking rules.
- `browsers/snapshot.ts` pairs browser data with native identities, keys scans, and retains valid enrichment. `use-browser-snapshot.ts` owns navigation seeding and live refreshes; `browsers/client.ts` shares in-flight scans across callers.
- `window-data.ts` publishes the native snapshot before named application/order/metadata/browser/AX enrichment stages. `use-stable-results.ts` commits appended row positions after rendering.
- `browsers/firefox-reconciliation.ts` owns pure companion/AX matching. The Firefox adapter owns IPC and discovery.
- `assets/browser-accessibility.swift` owns shared browser window discovery. Browser entry points retain their engine policies and tab traversal.

### Startup snapshots

`useWindowSearch` shows the cached snapshot immediately, then publishes fresh native windows before slower browser queries finish. Running apps, order, AX windows, browser counts, and tabs update as each query completes. Existing browser enrichment stays visible while native window/process identities remain valid; closed windows and restarted processes discard their old enrichment. A first launch without a cache leaves the loading view as soon as native windows arrive.

Selection or typing holds the current row positions and Space sections. Later matches append within their section, and held rows keep receiving current data by identity. A missing target stays in place as **No longer available**, with only **Refresh List** available. Changing the query, arrangement, or explicitly refreshing rebuilds the layout. AX result identities include the expected title and subrole because an AX index can be reused after closure; focus actions also retain their live target checks.

Only a completed load writes the persistent snapshot, once. Cancellation ignores later updates, and a failed refresh keeps the latest visible data without persisting its partial snapshot. Optional query failures retain available data and are logged independently.

Browser navigation receives one browser snapshot containing its native windows and any known tabs, then revalidates them. The navigation query consumes that seed once; later refreshes rediscover native windows. Snapshot keys include the browser identity and native window state, so changed or mismatched seeds cannot reuse a different browser's layout. Simultaneous requests for the same browser and native snapshot share one in-flight scan. The request is removed when it succeeds or fails, so later refreshes read live data. Each browser has its own helper session and queue, including browsers that share an engine.

Cached rows can render during the per-launch prerequisite check, with their actions disabled. Window discovery and row actions become available only after the check succeeds; missing permissions still open the setup view. This avoids flashing an empty loading screen on each launch without reusing a previous permission decision.

## Browser companion

`companion/background.ts` and `companion/manifest.json` are shared by Firefox and Zen.

```sh
npm run build:companion
npm run package:companion
```

The build generates `dist/companion/extension/`; packaging creates the unsigned ZIP for Mozilla signing. The Firefox- and Zen-specific build/package commands are aliases. See [release automation](release-automation.md) for signing and publishing.

For Zen Console probes, run `npm run build:privileged` and use the generated JavaScript in `dist/privileged/`. Do not paste TypeScript source into Zen.

## Raycast distribution

Store submissions use source-built universal helpers with verified code signatures. Developer ID is optional for this submission flow. After updating code and taking Store screenshots in `metadata/`, run:

```sh
npm run build
npm run typecheck
npm run lint
npm test
```

Add the changed source, helpers, manifest, listing files, and screenshots to Git. Then run `npm run verify:store`, commit the changes, and run `npm run publish`. The CLI creates a PR for Raycast review; approval and a downloaded clean-install check remain separate from local verification.

### Optional Developer ID distribution

For a separately Developer ID-signed package, use your own certificate:

```sh
APP_HOPPER_SIGNING_IDENTITY='Developer ID Application: Your Name (TEAMID)' npm run package:native
npm run build -- --environment dist
npm run verify:native -- --release
```

The build preserves an unchanged, verified Developer ID package. Changing helper sources requires signing a new package.

`verify:native -- --release` additionally checks Developer ID signatures, hardened runtime, and secure timestamps. It does not perform notarization. See the [compatibility checklist](compatibility.md) before claiming notarized distribution or downloaded-artifact Gatekeeper acceptance.

## CI

Pushes to `main` and pull requests run the build, typechecks, lint, regression tests, native verification, and companion/source packaging on macOS. CI artifacts are unsigned and are not production installers.

The manual **Sign and release companion** workflow defaults to build-only mode. See [release automation](release-automation.md) for signing, publishing, and recovery steps.
