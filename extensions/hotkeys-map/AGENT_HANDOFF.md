# Agent Handoff — Raycast Hotkeys Map (`/Users/robert/Code/hotkeys`)

## 1. Project Overview
A local macOS Raycast extension (`e:n:robert/hotkeys-map`) that visualizes, audits, and practices Raycast hotkeys and aliases on an interactive macOS-style keyboard inside a standalone native `WKWebView` window (`assets/HotkeysViewer`, compiled from `scripts/viewer.swift`), paired with a quick-glance Menu Bar command (`src/menu-bar-hotkeys.tsx`).

- **Repo Root:** `/Users/robert/Code/hotkeys`
- **Git HEAD:** `21b465a` (clean working tree)
- **Build Command:** `npm run build` (runs `npm run sync` → compiles `scripts/viewer.swift` to `assets/HotkeysViewer` → runs `ray build -e dist -o dist`)
- **Reinstall Local Extension:** `developer__install-local-extension` with `path: "/Users/robert/Code/hotkeys/dist"` and `sourcePath: "/Users/robert/Code/hotkeys"`

---

## 2. Work Completed

### Core Architecture & Native Window
- **Native macOS `WKWebView` Host (`scripts/viewer.swift`):**
  - Single-instance window activation, remembered window frame (`RaycastHotkeysMapWindow`), custom Dock icon (`assets/app-icon.png`), standard macOS menu bar (`⌘P`, `⌘W`, `⌘Q`, `⌘C`/`⌘V`).
  - `WKNavigationDelegate` routing `raycast://` deeplinks via `NSWorkspace`.
  - `WKScriptMessageHandler` bridges:
    - `mcpFetch`: Native `URLSession` HTTP bridge to `http://127.0.0.1:8267/mcp` (zero CORS issues).
    - `printPage`: Native `NSPrintOperation` (landscape, fit-to-width) + `⌘P`.
    - `saveHotkeysJson`: Auto-saves MCP-synced data back to `assets/hotkeys.json` so **Hotkeys Menu Bar** stays live-synced.
    - `listRunningApps` & `scanAppShortcuts`: Walks running macOS apps' `AXMenuBar` via `AXUIElement` Accessibility API.
    - `scanMacosShortcuts`: Reads `~/Library/Preferences/com.apple.symbolichotkeys.plist` and merges overrides/disables with macOS defaults.
- **Data Pipeline:** Single shared `assets/hotkeys.json` + `scripts/sync.mjs` generating `assets/hotkeys-data.js` (no hardcoded hotkeys/aliases in HTML or TS).
- **Commands:**
  - `src/open-hotkeys-map.ts` (`no-view`, alias `hk` in user's Raycast Settings).
  - `src/menu-bar-hotkeys.tsx` (`menu-bar`, reads `assets/hotkeys.json` dynamically).

### Interactive Keyboard & Features (`assets/raycast-hotkeys.html`)
- **3-Zone macOS Toolbar:** `Map | Free Keys | Heatmap` segmented control, `Tools ▾`, `Keyboard ▾`, `Export ▾` popovers, `Clear filters` pill, `?` shortcuts overlay, backdrop-click modal dismissal.
- **Keyboard Layouts & Profiles:** ANSI / ISO toggle; `MacBook`, `TKL (F-Row)`, `Full (Numpad)` profiles; Left/Right/Any modifier side filter.
- **Exact Modifier Filtering & Hyper Key:** Exact modifier matching with physical modifier key highlights; Hyper Key Shift toggle (`⌃⌥⌘` vs `⌃⌥⇧⌘`); dynamic physical Hyper Key mapping (`general:hyperKeyCode`).
- **Live Raycast MCP Integration:**
  - Auto-sync on launch (when Bearer token is saved in `localStorage`) + clickable `MCP · HH:MM ↻` status pill.
  - Pulls live Hotkeys, Aliases, and Hyper Key settings; formats raw internal Raycast IDs via `cleanRaycastTitle()`; supports persistent custom renaming (`✎`, hover-only) and persistent per-hotkey group assignment (`raycast_custom_titles_v1`, `raycast_custom_hk_groups_v1`).
  - Conflict Resolver with Raycast coexistence conflict rules, exact overlapping macOS/app shortcut names, `Apply via MCP (N)` (`update-setting`), `Apply via AI (N)`, and `Raycast Shortcuts` (`raycast://settings/shortcuts`) deeplink.
- **Groups & App Layers:**
  - Color-coded toggleable groups; Edit Groups modal with add/rename/recolor/delete (`×`) and key counts.
  - Multi-App Comparison Layers (`macOS`, `VS Code`, `Warp`, `Zen Browser`) with hover tooltips, Key Inspector details, persistent remove (`×`), and `+ Add App` modal (live macOS menu bar scan, `Scan macOS System`, VS Code/Cursor/Obsidian JSON import, or manual `Title | ⌘K` entry).
- **Productivity & Export Tools:** Practice Flashcard Trainer, Ergonomics & Hand-Balance Dashboard, Live Keyboard Test, Aliases tab with strict-prefix overlap audit & `␣` notation, `⌘K` Command Palette, SVG Export, JSON Import/Export, Native Print / PDF.

---

## 3. What Was Omitted / Known Limitations
- **`npx ray lint` is currently broken:** `@raycast/eslint-config` v1 conflicts with ESLint v9 flat config in `package.json`. Build validation currently relies on `npm run build` (`ray build -e dist -o dist`), which compiles TypeScript cleanly.
- **Raycast Store Binary Restriction:** `assets/HotkeysViewer` is a pre-compiled Swift binary bundled in `assets/`. The Raycast Extension Store **rejects pre-compiled binaries** for security reasons.
- **Personal Data in `assets/hotkeys.json`:** Currently contains the user's personal 52 hotkeys and 9 aliases rather than a clean generic starter/demo dataset.
- **Store Metadata & Assets:** Missing `CHANGELOG.md`, Store screenshots (`2000×1250`), `platforms: ["macOS"]` in `package.json`, and updated `README.md` documenting MCP setup.
- **No Remote Git Repo Yet:** Git is local-only at `/Users/robert/Code/hotkeys`.

---

## 4. What Is To Be Done (Next Steps for Raycast Store Publishing)
If the user decides to publish to the public Raycast Extension Store (recommended: do this on a dedicated `store` branch to preserve the local native binary on `main`/`master`):

1. **Resolve the Pre-compiled Binary Blocker:**
   - Remove `assets/HotkeysViewer` from the Store submission.
   - Choose a Store-compliant approach: either compile Swift on-demand / use Raycast's supported Swift Package mechanism (`swift` source compiled via `@raycast/api` / Store-approved build flow), **or** open `assets/raycast-hotkeys.html` in the user's default browser / native Raycast `List`/`Detail` views.
2. **Sanitize Default Data:**
   - Replace personal shortcuts in `assets/hotkeys.json` with a clean, minimal starter/demo set (and prompt first-time users to connect Raycast MCP or import JSON).
3. **Fix `npx ray lint`:**
   - Align `eslint` and `@raycast/eslint-config` versions (e.g., ESLint v8 or updated `@raycast/eslint-config` v2 flat config) so `npx ray lint` exits with 0 errors.
4. **Prepare Store Metadata & Assets:**
   - Add `"platforms": ["macOS"]` and verify `author` matches the user's Raycast Store handle in `package.json`.
   - Add `CHANGELOG.md` and update `README.md` with clear MCP Server setup instructions.
   - Capture 3–6 Store screenshots (`2000×1250` PNG, no personal/sensitive info) in `metadata/`.
5. **Final Validation:**
   - Run `npx ray lint` and `npx ray build -e dist -o dist` with zero errors before running `npx ray publish` (only when explicitly requested by the user).
