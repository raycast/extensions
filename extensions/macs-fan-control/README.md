# Macs Fan Control for Raycast

Drive [Macs Fan Control](https://crystalidea.com/macs-fan-control) from Raycast — switch presets,
set fan speeds, create new presets, and watch live fan RPM and temperatures without opening the app.

## Commands

| Command | What it does |
| --- | --- |
| **Start Fan** | Live dashboard: fan RPM, temperatures, and every preset with apply/edit/delete. |
| **Start Fan Control** | Launches Macs Fan Control (optionally toggles it off again). |
| **Start Fan Auto** | Hands every fan back to the system. |
| **Start Fan Full Blast** | Spins every fan to maximum. |
| **Start Fan Preset** | Applies any preset by name — including your own. |
| **Set Fan Speed** | Pins the fans to a specific RPM. |
| **Create Fan Preset** | Saves a new named preset into Macs Fan Control. |

## Your own presets

Your presets are read live out of Macs Fan Control — nothing is hardcoded. Whatever you have
saved in the app shows up in **Start Fan**, in the menu bar, and as a target for
**Start Fan Preset**.

To make a preset directly typeable in Raycast's root search, open **Start Fan**, highlight the
preset and press `⌘L` (**Add as Quicklink**). Raycast pre-fills the name as
`Start Fan <preset>`, so typing "start fan half" hits your "Half" preset straight away. Keep the
name or change it — the Quicklink is yours.

## How it works

Fan control needs root, so this extension does not do it. Every change is written into Macs Fan
Control's own preferences, and the app applies it through its own privileged helper — the same
path the app uses when you click a preset yourself. Because the app reads its preferences only at
launch, applying a preset restarts it, which takes a couple of seconds.

Macs Fan Control already shows fan speed in the menu bar, so this extension deliberately does not
add a second menu bar item.

### The `smc-reader` helper

Live fan and temperature readings need the SMC, which has no shell or scripting interface, so the
extension ships one small native helper.

- **Full source is in this repository** — `native/smc.c` (about 200 lines) and `native/Makefile`.
- **Read-only by construction.** It issues only SMC *read* commands. It never writes an SMC key, so
  it needs no elevated privileges and cannot change how the fans behave.
- **Reproducible.** Rebuild with `npm run native` (clang, universal arm64 + x86_64) and compare:

  ```
  shasum -a 256 assets/smc-reader
  c93fbbcc9817926e7026d5b4ca5c3bf3954ca94ca45d7cf844b9a391568c63ef
  ```

All *control* is delegated to Macs Fan Control, never to this binary.

Sensor-based fan rules created in Macs Fan Control are preserved untouched — this extension reads
and re-writes them verbatim rather than trying to reinterpret them.

## Requirements

- [Macs Fan Control](https://crystalidea.com/macs-fan-control)
- Creating and switching **custom** presets is a Macs Fan Control Pro feature. Automatic and
  Full Blast work on the free version.
