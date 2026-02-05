# Floaty — Raycast Extension

Floaty lets you pin and manage floating windows using the Floaty app ([floatytool.com](https://www.floatytool.com/)). This Raycast extension provides quick commands to list, pin, show, and restore floating windows from your keyboard.

## Features

- List open Floaty-managed windows
- Pin a selected window into Floaty
- Show the main Floaty window
- Unpin or restore all pinned windows
- Quick keyboard-driven window selection and actions

## Commands

- `List Windows` — shows currently available windows managed by Floaty ([src/list-windows.tsx](src/list-windows.tsx)).
- `Select Window to Pin` — interactive window picker to pin a window ([src/select-window-to-pin.ts](src/select-window-to-pin.ts)).
- `Show Main Window` — bring Floaty main UI to front ([src/show-main-window.ts](src/show-main-window.ts)).
- `Unpin or Restore All Windows` — remove all pins or restore original window state ([src/unpin-or-restore-all-windows.ts](src/unpin-or-restore-all-windows.ts)).

## Install

There are two common ways to use this extension:

- Raycast Store: Search for "Floaty" in the Raycast Extensions store and install.
- From source (developer mode):
  1. Clone this repository into your local Raycast extensions folder.
  2. Install dependencies and build (if required) per your Raycast development setup.

If you need a packaged release or help publishing to the Raycast Store, I can add a `package.json` script and publishing notes.

## Requirements

- Floaty app installed and running: [https://www.floatytool.com/](https://www.floatytool.com/)
- Raycast (Mac) with developer mode enabled if installing from source.

## Usage

Open Raycast and run any of the commands above. Typical flows:

- Pin a window: run `Select Window to Pin`, choose a window, then confirm to pin into Floaty.
- List windows: run `List Windows` to see active windows and quick actions.
- Restore: run `Unpin or Restore All Windows` to clear pins.

## Development notes

- Entry points are in `src/`. Match commands in `package.json` and the extension manifest if you change filenames.
- Keep Floaty running while testing commands that interact with the app.

## Links

- Project / website: [https://www.floatytool.com/](https://www.floatytool.com/)
- Repository: [https://github.com/raycast/extensions](https://github.com/raycast/extensions) (this extension lives under `extensions/floaty`)

---

If you want, I can also:

- Remove any additional non-English text across the repo (I removed Chinese comments from config already).
- Add a short `CONTRIBUTING.md` and developer run scripts for local testing.
