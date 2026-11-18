# Magic Ingest Changelog

## [Initial Release] - 2026-04-30

- Initial release: background photo & video ingest from memory cards, live progress, date and star filtering, SHA-256 verification, smart collision handling, renaming with folder prefix, Photo Mechanic integration, auto-eject, recent presets
- Support up to 3 concurrent ingest jobs (previously only one at a time)
- **Ingest Status** command is now a view — lists all running jobs with per-job progress, stop, and "Show Destination" actions, plus a "Start New Ingest" shortcut
- Magic Ingest no longer redirects to the status screen after submit — the form stays open so you can queue another ingest immediately
- Card eject waits until no other job is still using that card
- Destination dedupe now hash-checks on filename collision: a reformatted card whose camera restarts numbering at IMG_0001 will rename rather than silently skip new files that share names with already-ingested ones
- Per-job state files replace the single PID file (`~/Library/Logs/raycast-photo-ingest/jobs/{jobId}.json`)
