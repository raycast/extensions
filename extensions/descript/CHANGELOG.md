# Descript Changelog

## [Initial Version] - 2026-07-23

- Browse Projects list with an inline detail pane, composition and media counts/durations, and a drill-in Contents view that groups compositions and media files by type with deep links to the Descript web app.
- Recent Jobs with type filter (Imports / Underlord edits / Publishes), background-upload tracking, per-job polling while work is in flight, and Copy / Open share URL actions for finished publishes.
- Publish Composition form (opened from Browse Projects or Contents) for video / audio publish jobs; share URLs appear in Recent Jobs and Descript Activity when the job completes.
- Import Selected Media form that targets a new or existing project (with type-to-search across projects) and uploads in detached background processes.
- Run Underlord Prompt form with starter presets, composition picker, type-to-search project selector, and user-saved prompt favorites.
- Descript Activity menu-bar command summarizing active uploads, in-progress jobs, and recently finished activity, with adaptive refresh, cross-command nudges from job kickoffs and state changes, and command shortcuts.
- Personal API token preference with secure storage and graceful 401 / missing-token recovery.
- Background upload status files include a short hash of the original file name so sanitized paths cannot collide (e.g. `"a b.mp4"` vs `"a_b.mp4"`).
