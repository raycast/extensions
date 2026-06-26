# miccast — Raycast Audio Device Switcher

**Date:** 2026-06-26
**Status:** Approved design

## Purpose

A custom Raycast extension that lets the user quickly switch the active macOS
audio **input** (microphone) and **output** (speakers/headphones) device from a
searchable list. Motivated by the need to constantly switch between a
microphone, a headset, and the MacBook's built-in mic.

## Scope

- Two commands: **Set Input Device** and **Set Output Device**.
- Each command opens a searchable list of devices for its type, marks the
  currently active device, and switches on selection.
- Out of scope (YAGNI): cycle/hotkey toggle commands, volume control, "lock
  volume" behaviors, persistence/auto-restore after sleep or Bluetooth
  reconnect.

## Mechanism

Use the [`macos-audio-devices`](https://github.com/karaggeorge/macos-audio-devices)
npm package. It bundles a compiled Swift binary that talks directly to CoreAudio
to list devices, read the current default, and set a new default — synchronously
or asynchronously. It ships inside `node_modules`, so **no Homebrew or separate
install is required**; the extension works as soon as it is installed.

Rejected alternatives:
- `SwitchAudioSource` (Homebrew `switchaudio-osx`) — requires a separate manual
  install and absence-handling for no gain.
- Hand-written Swift CoreAudio binary — unnecessary effort for this scope.

## Architecture

Small, single-purpose units communicating through a thin typed interface:

- **`src/audio.ts`** — the only module that touches `macos-audio-devices`.
  Exposes:
  - `getDevices(type: "input" | "output"): Promise<Device[]>`
  - `getCurrent(type: "input" | "output"): Promise<Device>`
  - `setDevice(type: "input" | "output", id: number): Promise<void>`

  where `Device = { id: number; name: string; isCurrent: boolean }`.
  All CoreAudio contact and package-shape adaptation lives here. The
  underlying `macos-audio-devices` package uses numeric device `id`s and
  the function names `getInputDevices` / `getOutputDevices` /
  `getDefaultInputDevice` / `getDefaultOutputDevice` /
  `setDefaultInputDevice` / `setDefaultOutputDevice`.

- **`src/device-list.tsx`** — a shared `<List>` React component, parameterized
  by `type`. Loads devices + current via `audio.ts`, renders one `<List.Item>`
  per device, marks the active one with an accessory/icon, and on selection
  calls `setDevice` then shows a HUD/toast and closes the window. Both commands
  render this so UI logic is not duplicated.

- **`src/set-input.tsx`** — Input command entry point: `<DeviceList type="input" />`.

- **`src/set-output.tsx`** — Output command entry point: `<DeviceList type="output" />`.

Both commands are Raycast `view` mode commands declared in `package.json`.

## Data flow

1. Command mounts → `device-list` calls `audio.getDevices(type)` and
   `audio.getCurrent(type)`.
2. Render `<List>`; the active device is visually marked.
3. User selects a device → `audio.setDevice(type, id)`.
4. On success → show a confirmation toast ("Now using: <name>") and close the
   Raycast window.

## Error handling

- If `macos-audio-devices` throws or returns no devices, show a Raycast failure
  toast with the error message instead of crashing; render an empty-state list.
- If switching fails, surface the error as a toast and keep the list open so the
  user can retry.

## Testing

- **`audio.ts`** is the unit under test: mock `macos-audio-devices` and assert
  each function maps package inputs/outputs to the `Device` shape correctly,
  including the `isCurrent` flag and error propagation.
- The `.tsx` command files stay thin enough to verify manually in Raycast dev
  mode (`ray develop`).

## Tooling / setup notes

- Scaffold with the Raycast extension template (TypeScript + React).
- Requires the Raycast `ray` CLI (installed via `npm`/Raycast) for `ray develop`
  and `ray build`; not currently installed in this environment.
- Node 22 is available.
