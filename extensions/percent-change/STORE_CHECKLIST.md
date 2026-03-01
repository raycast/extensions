# Raycast Store Submission Checklist

Last updated: 2026-02-27

## Completed

- Command builds successfully (`npm run build`).
- TypeScript passes (`npx tsc --noEmit`).
- Prettier passes on key files (`src/index.tsx`, `README.md`, `package.json`).
- Extension icon is valid at `512x512` (`assets/icon.png`).
- Manifest includes explicit platform targeting (`"platforms": ["macOS"]`).
- Command metadata is present (`name`, `title`, `description`, `mode`).
- README added and aligned with actual Raycast behavior and shortcuts.

## Open Items Before Publish

- Verify `author` in `package.json` exactly matches your Raycast username (case-sensitive).
  - Current value: `"Milos"`
  - Raycast lint validates this value via Raycast API.
- Re-run `npm run lint` in an environment with network access to Raycast endpoints.

## Notes

- Raycast Form description rows are display-only. Copying is action-based via the action panel (`Cmd + C`, `Cmd + Shift + C`), not by clicking the output row itself.
