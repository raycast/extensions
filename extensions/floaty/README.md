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

- Raycast Store: Search for "Floaty" in the Raycast Extensions store and install.

## Requirements

- Floaty app installed and running: [https://www.floatytool.com/](https://www.floatytool.com/)
- Raycast (Mac) with developer mode enabled if installing from source.

## Usage

Open Raycast and run any of the commands above. Typical flows:

- Pin a window: run `Select Window to Pin`, choose a window, then confirm to pin into Floaty.
- List windows: run `List Windows` to see active windows and quick actions.
- Restore: run `Unpin or Restore All Windows` to clear pins.

## Links

- Project / website: [https://www.floatytool.com/](https://www.floatytool.com/)
- Repository: [https://github.com/raycast/extensions](https://github.com/raycast/extensions) (this extension lives under `extensions/floaty`)

