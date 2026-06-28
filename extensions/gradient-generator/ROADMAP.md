# Gradient Generator – Roadmap

This document tracks planned work. Timelines are indicative; scope may shift based on usage and feedback.

## 1.1.0 – Multi-stop editor (feature)
Enable richer editing of stops directly in Preview or a mini editor.

- UX
  - [ ] Add/Remove specific stops
  - [ ] Reorder stops
  - [ ] Optional positions/percentages per stop for CSS/Tailwind output
- Output
  - [ ] Reflect positions in CSS/Tailwind output when provided

## 1.1.x – Export & share
- [ ] Export current gradient as PNG and SVG (local only)
- [ ] Copy image to clipboard (rasterised)
- [ ] Shareable link format encoding `{ type, angle, stops }`

## 1.2.0 – Colour input parsing
- [ ] Accept `rgb()` and `hsl()` inputs in addition to `#RRGGBB` (store original strings)
- [ ] Normalise for output while preserving input fidelity in UI

## 1.2.x – Tailwind & SwiftUI enhancements
- [ ] Tailwind: support explicit stop positions and more than 3 stops gracefully
- [ ] SwiftUI: smarter angle-to-UnitPoint mapping and optional `stops` with locations

## 1.3.0 – Presets & library
- [ ] Curated preset gradients (categories: Warm, Cool, Pastel, Neon, Duo, Triadic)
- [ ] “Apply Preset” action from Create and Preview

## 1.3.x – Accessibility & contrast
- [ ] Contrast checks and warnings for foreground legibility on gradient backgrounds
- [ ] Suggested foreground colour over the current gradient

## 1.4.0 – Advanced preview
- [ ] Preview sizes (thumbnail, banner, wallpaper)
- [ ] Orientation helpers and common angles

## Later / Nice-to-have (speculative)
- [ ] Apple Shortcuts actions (Generate Gradient, Save Gradient)
- [ ] Import/Export of saved gradients to JSON
- [ ] Palette extraction from image to gradient suggestion
- [ ] Keyboard-first mini editor with live preview

---
Have a suggestion? Open an issue or PR with context and proposed acceptance criteria.
