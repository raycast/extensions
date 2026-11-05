# Gradient Generator Changelog

## [Reliability Fixes] - 2026-11-04

- Fix Random Gradient render timeouts by referencing temporary local preview PNGs and retain full preview resolution.
- Preserve labels from Create through Preview and saved-library actions.
- Unify label editing and replacement confirmation; keep forms open on cancellation or failure.
- Read storage before writes, reject stale edits and preserve invalid stored data for recovery.
- Validate actual color fields, angles, filenames and output dimensions; use a consistent 2–10-stop limit.
- Correct conic orientation and rectangular linear/radial geometry; explicitly use sRGB interpolation.
- Copy a complete SwiftUI view with exact angle geometry and numeric color values.
- Stage PNG/SVG writes, confirm replacements, prevent duplicate submissions and retain failed export forms.
- Remove the misleading endpoint-transparency option and unsupported conic SVG substitution.
- Apply the Tailwind preference consistently and cache saved-list thumbnails.

## [1.1.0] - 2025-08-26

- Add ability to copy/save preview as **PNG** with size presets
- Add ability to copy/save as **SVG** (vector)
- Add **Tailwind output** toggle for gradient code
- Add **Quick Rename** command for gradients
- Streamline preview command architecture to support new features
- Improve UX with logical tab order, reset action, and better keyboard shortcuts
- Add comprehensive input validation to prevent crashes from invalid values
- Remove deprecated `src/preview-gradient.tsx` (replaced by new preview flow)

## [1.0.0 - Initial Release] - 2025-08-22

- Initial public release of Gradient Generator
- Create and preview linear and radial gradients
- Add, remove, and adjust gradient stops with colours and positions
- Copy CSS snippets directly to clipboard