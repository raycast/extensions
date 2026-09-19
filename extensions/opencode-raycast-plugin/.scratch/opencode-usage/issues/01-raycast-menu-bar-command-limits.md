# Raycast menu-bar command limits

Status: resolved
Type: research
Blocked by: —

## Question

What does the Raycast extension API allow for a persistent menu-bar presence in 2026, and at what refresh cadence? Answer precisely, with sources:

1. Does `@raycast/api` expose a `MenuBarExtra` component, and is a menu-bar command (the thing that renders an icon/title in the macOS menu bar) a supported command type?
2. Can a menu-bar command show dynamic **title text** (e.g. a live percentage) and an icon that change over time?
3. What drives updates? What is the practical minimum/maximum refresh cadence, does it need the build-time `backgroundRefresh` capability + a refresh interval preference, and are there hard limits (e.g. can't refresh faster than every N minutes)? When exactly does a menu-bar command re-render?
4. Can menu-bar commands open other commands/windows (e.g. switch to the full view)?
5. Any Raycast Store review constraints relevant to a personal usage extension reading a local file and hitting a third-party API? Does a Store-compatible extension need `npm run build` conventions, and does a local-only extension need any of it?
6. Known macOS/UX caveats of Raycast menu-bar extras (system limit on icon bar spacing, whether Raycast must be running, right-click/hover behavior).

Note in the findings which facts are version-sensitive and worth re-checking at build time. This ticket exists to decide **Menu-bar surface**, so the refresh-cadence constraints are the payload.

## Answer

Findings: `.scratch/opencode-usage/research/menu-bar-command-limits/findings.md`

- `MenuBarExtra` exists in `@raycast/api`; a menu-bar command is `mode: "menu-bar"` in the manifest (macOS-only). Dynamic title text and icon are supported; re-renders happen on launch, scheduled background run, menu click, Raycast restart, re-enable, or preference change — menu-bar commands are **not long-lived**.
- **Refresh cadence:** driven by the `interval` manifest property + background refresh. Hard floor **10s** since @raycast/api v1.42.0; no documented max; scheduling is imprecise (macOS energy tolerance) and slow runs are auto-terminated. Practical floor ~30s–1m. Manifest doc still says min 1m — re-verify at build time.
- Menu-bar items can open the full view via `launchCommand` (same extension) or a `raycast://` deeplink.
- Extensions are **not sandboxed** for file I/O or networking → reading `~/.local/share/opencode/auth.json` and calling the API is fine.
- Caveats: Raycast must be running; macOS hides the extra when the bar is full; right-click / ⌥ `alternate` items need macOS Sonoma+; hover text = `tooltip`.
- Store vs local: Store needs `npm run build`/`lint`, package-lock, MIT, README; a local-only extension needs none of that.

