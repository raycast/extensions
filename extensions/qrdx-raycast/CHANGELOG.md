# QRdx Changelog

## [Raycast Store Release] - {PR_MERGE_DATE}

### Added

- **Frames:** Generate QR offers `qrdx`'s call-to-action frames, from a bottom banner to a speech bubble, a phone and a ticket, with your label (up to 24 characters, "Scan me" by default), a frame color and a label color. The ⌘4 picker shows each frame with previews. The list comes from `qrdx`, so its updates bring new frames along. Generate QR with AI, the AI tool and Saved QR Codes use frames too.

### Changed

- First release in the Raycast Store.
- Frames replace templates: no picker, prompt or AI tool offers templates any more. Codes saved with a template still show and export with it, and choosing a frame for one replaces its template.
- Uses Raycast API 2.13 and Raycast's standard keyboard shortcuts for copy, save, open and edit. The keys are the same as before.
- US English spelling in descriptions and hints.

### Fixed

- Pattern previews in the pickers are sharp. They were drawn at 64 px and stretched to fill the tiles.
- The pickers' previews show what each choice changes. Every tile showed a whole black code, so eye and center shapes were too small to tell apart. The eye and eye center pickers now show one eye close up, and each preview draws the part its picker changes in black and the rest in light gray: the eye's frame or its center, the body pattern, or the frame around a gray code.
- Edit QR Code on a saved code opens its preview after Generate, where Update Saved QR saves the changes. Generate did nothing before. Edit on a preview goes back to the form with the same values instead of an empty one.
- The preview after Generate fits the window. The code was drawn across the full width and cut off at the bottom, with its settings out of view below it. It's now shown whole, with its settings in a panel beside it.
- Saved QR Codes shows the selected code and its settings in a pane beside the list; before, you saw only a small icon. Saved codes are drawn at 512 px (they were 256), and earlier saves are redrawn the first time the list opens. The list shows a code's changes when you come back from editing it.

## [1.2.0] - 2026-11-22

### Added

- **The newer shapes from `qrdx` 0.0.60:** 14 more body patterns (horizontal lines, liquid, classy, leaf, plus, hexagon, star, heart, random dots, mosaic, octagon and others), 14 more eye frames (including porthole, notch, plus, bud and bowl), 14 more eye centers (including leaf, drop, heart, flower and cushion) and the Dot Ring template. The pattern pickers, Generate QR with AI and the AI tool all offer them.

### Changed

- Uses `qrdx` 0.0.60 (was 0.0.47). The pattern and template lists now come from `qrdx`, so they follow its updates and leave out the shapes it has retired.
- Pattern previews are redrawn after a `qrdx` update. An eye frame's preview shows it with the center of the same name where `qrdx` has one, and with a round center otherwise.

## [1.1.0] - 2026-11-04

### Added

- **Open in QRdx Playground** action (⌘O) on a code's preview and on each saved code. It opens the full editor at qrdx.dev with the code's web address; other content, colors and patterns stay in Raycast.

## [1.0.0] - 2026-03-25

### Added

- **Generate QR** command — create customized QR codes with body patterns, corner styles, colors, decorative templates, and logo overlay
- **Saved QR Codes** command — browse, preview, edit, and export previously saved QR configurations
- **Generate QR with AI** command — describe the QR code you want in plain English and let AI configure it for you
- AI tools (`generate-qr`, `list-saved`) for Raycast AI integration via `ai.yaml`
- Export as PNG or SVG to Downloads, and copy to clipboard
- Save/load QR configurations with thumbnail previews using Local Storage
