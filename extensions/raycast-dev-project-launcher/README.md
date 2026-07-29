# Dev Project Launcher — Raycast Extension

Recursively scans your development directories, maps every subfolder to a
detected project entity (Xcode, Swift Package, Kotlin/Gradle, Node,
TypeScript, Python, Rust, Go, Java/Maven, Flutter, Ruby, or generic Git
repo), and gives you a multi-action panel to jump straight into **VS Code**,
**WebStorm**, or **iTerm** — with a fully dynamic, persistent app-path
mapping per project type.

## Features

- **Recursive project discovery** — scans `~/Development` (configurable) plus
  any number of extra directories, up to a configurable depth, skipping
  noisy folders like `node_modules`, `.git`, `build`, `DerivedData`, etc.
- **Project-type detection** via marker files (`Package.swift`,
  `*.xcodeproj`/`*.xcworkspace`, `build.gradle(.kts)`, `package.json`,
  `tsconfig.json`, `Cargo.toml`, `go.mod`, `pom.xml`, `pubspec.yaml`,
  `Gemfile`, Python project files, or a bare `.git` folder as a fallback).
- **Interactive `List` view** grouped by source root, with a distinct icon +
  color per project type, git-repo badge, and last-modified accessory.
- **Opens with the right tool per project type** — `Enter` uses the app mapped
  as *preferred* for the detected type (Xcode projects and Swift packages go to
  Xcode via `xed`, Gradle to Android Studio, everything else to VS Code), and
  VS Code / WebStorm / iTerm stay available as explicit actions.
- **Multi-action panel** on every project: Open in the preferred app, Open in
  VS Code (`Cmd+E`), WebStorm (`Cmd+W`), iTerm (`Cmd+T`), Reveal in Finder,
  Copy Path, Open With…, Rescan.
- **Custom user-defined project directories** — add as many extra scan roots
  as you like from extension preferences, no code changes required.
- **Persistent, dynamic app-path mapping** — a second command, *Manage App
  Paths*, lets you view/add/edit/remove the VS Code / WebStorm / iTerm path
  used for each project type, including project types you invent yourself
  (e.g. `deno`, `unity3d`). This is stored via Raycast's `LocalStorage`, so it
  survives restarts and isn't limited to a fixed manifest schema like static
  extension preferences are.

## Project Structure

```text
raycast-dev-project-launcher/
├── mise.toml                    # Task runner (wraps the npm scripts)
├── package.json                 # Raycast extension manifest + preferences
├── tsconfig.json
├── raycast-env.d.ts              # Typed preference/argument declarations
├── .eslintrc.json / .prettierrc
├── assets/
│   └── extension-icon.png
└── src/
    ├── types.ts                  # Shared domain types
    ├── list-projects.tsx         # Main "Browse Development Projects" command
    ├── manage-app-paths.tsx      # "Manage App Paths" command (Form + List)
    └── lib/
        ├── projectScanner.ts     # Recursive directory walk + root resolution
        ├── projectTypeDetector.ts# Marker-file based project type detection
        ├── appPathStore.ts       # LocalStorage-backed dynamic path mapping
        ├── openActions.ts        # Cross-editor "open project" logic
        └── projectIcons.ts       # Icon/color per project type
```

## Preferences (Extension Settings)

Configured from Raycast → Extensions → Dev Project Launcher → Preferences:

| Preference | Type | Default | Description |
| --- | --- | --- | --- |
| Development Root Directory | directory | `~/Developer` | Root folder scanned recursively. Leave it empty and the extension auto-detects the first existing of `~/Developer`, `~/Development`, `~/Projects`, `~/Code`, `~/dev`. |
| Additional Project Directories | text | *(empty)* | Comma-separated extra absolute paths, e.g. `~/Work,~/OpenSource`. |
| Scan Depth | dropdown | `2` | How many levels deep to search below each root (1–6, 8, 10). |
| Exclude Folder Names | text | `node_modules,.git,DerivedData,build,dist,.build,Pods,.gradle,.idea,.vscode` | Extra folder names to skip while walking. Folders starting with `.` or `_` are always skipped. |
| Default VS Code Command/Path | text | `code` | Fallback used when a project type has no specific mapping. |
| Default WebStorm Command/Path | text | `webstorm` | Fallback for WebStorm/JetBrains IDEs. |
| Default iTerm App Path | text | `/Applications/iTerm.app` | Fallback iTerm app path. |

## Dynamic per-project-type app paths

Static Raycast preferences are a fixed schema baked into `package.json` at
build time — you can't add a brand-new preference field at runtime. To make
the "map each project type to an editor path" requirement truly dynamic, this
extension keeps a **separate, user-editable store in `LocalStorage`**
(`src/lib/appPathStore.ts`) seeded with sensible defaults for every builtin
project type. Open the **Manage App Paths** command to:

- Edit the **Preferred App** (what `Enter` uses) plus the VS Code / WebStorm /
  iTerm path for any existing type.
- Register a completely new project type (e.g. `unity3d`) with its own
  mapping — no source changes or extension re-install needed.
- Remove custom types you no longer need (builtin types simply revert to
  their shipped defaults).

Each path field accepts either:

- a bare CLI command available on `PATH` (e.g. `xed`, `code`, `webstorm`,
  `idea`, `pycharm`, `goland`, `clion`, `rubymine`),
- an absolute path to a CLI binary,
- an absolute path to a `.app` bundle (or its Spotlight-resolvable display
  name, e.g. `Visual Studio Code`), or
- a bundle identifier such as `com.apple.dt.Xcode`, which Launch Services
  resolves wherever the app lives — useful for side-by-side installs like
  `/Applications/Xcode-26.6.0.app` that an absolute path would miss.

The extension host augments `PATH` with the common install locations for VS
Code's shell command and JetBrains Toolbox scripts before invoking bare
commands, and falls back to macOS `open -a` for `.app` bundles and iTerm.

## Requirements

- macOS (VS Code / WebStorm / iTerm launch logic relies on `open -a` and the
  JetBrains/VS Code CLI shims).
- [Raycast](https://raycast.com) installed.
- Node.js 20+ and npm for building.
- Optional CLI shims installed for a smoother experience:
  - VS Code → *Cmd+Shift+P → Shell Command: Install 'code' command in PATH*.
  - JetBrains IDEs → install via [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/),
    which creates command-line launchers automatically.

## Install into Raycast

This extension isn't on the Raycast Store, so you install it locally by
running the dev server once. Raycast registers the extension while
`ray develop` is running and **keeps it installed after you stop the
process** — there's no separate "install" step.

```bash
git clone https://github.com/amine2233/raycast-dev-project-launcher.git
cd raycast-dev-project-launcher
mise run dev          # or: npm install && npm run dev
```

Then:

1. Make sure the Raycast desktop app is running and you're signed in
   (`ray develop` needs both).
2. Open Raycast and type **Browse Development Projects** — the command
   appears as soon as the dev server has compiled.
3. Press `Cmd+,` on the command (or Raycast → Extensions → *Dev Project
   Launcher*) to set your **Development Root Directory** and the other
   [preferences](#preferences-extension-settings).
4. Stop the dev server with `Ctrl+C`. The extension stays installed.

To uninstall: Raycast → Extensions → *Dev Project Launcher* → `Cmd+Ctrl+X`.

After changing the source you have to run `mise run dev` again for Raycast
to pick up the new build.

### Tasks

The repo uses [mise](https://mise.jdx.dev) as the task runner; every task is
a thin wrapper over the matching npm script, and `install` runs automatically
as a dependency.

| Task | Runs | What it does |
| --- | --- | --- |
| `mise run dev` | `ray develop` | Dev server — also what installs the extension locally. |
| `mise run build` | `ray build -e dist -o dist` | Production bundle in `dist/`. |
| `mise run typecheck` | `tsc --noEmit` | Type sanity check. |
| `mise run lint` / `mise run fix` | `ray lint` (`--fix`) | `@raycast/eslint-config` rules. |
| `mise run check` | typecheck + lint + build | Everything before a publish. |
| `mise run publish` | `npx @raycast/api publish` | Publish to the Raycast Store. |

Publishing requires the `author` field in `package.json` to be a real Raycast
username, otherwise validation fails with `Invalid author`.

## Commands

1. **Browse Development Projects** (`list-projects`) — the main List view.
2. **Manage App Paths** (`manage-app-paths`) — view/add/edit/remove the
   dynamic per-project-type editor mapping.

## Notes on project-type detection boundaries

The scanner stops descending into a directory as soon as it's classified as
a project (a marker file matched, or a `.git` folder is present), so a
monorepo's internal `packages/`, `node_modules/`, or build folders are never
listed as separate top-level projects. Folders that don't match any marker
keep being explored recursively up to the configured **Scan Depth**.
