# Magic Ingest Changelog

## [Concurrent Ingests] - {PR_MERGE_DATE}

- Support up to 3 concurrent ingest jobs (previously only one at a time)
- **Ingest Status** command is now a view — lists all running jobs with per-job progress, stop, and "Show Destination" actions, plus a "Start New Ingest" shortcut
- Magic Ingest no longer redirects to the status screen after submit — the form stays open so you can queue another ingest immediately
- Card eject waits until no other job is still using that card
- Destination dedupe now hash-checks on filename collision: a reformatted card whose camera restarts numbering at IMG_0001 will rename rather than silently skip new files that share names with already-ingested ones
- Per-job state files replace the single PID file (`~/Library/Logs/raycast-photo-ingest/jobs/{jobId}.json`)

## [Initial Release] - {PR_MERGE_DATE}

- Initial release
- Background photo & video ingest from memory cards
- Live progress bar in Raycast search
- Date and star rating filtering
- SHA-256 copy verification
- Smart filename collision handling
- File renaming with folder prefix
- Photo Mechanic integration
- Auto-eject cards after ingest
- Recent presets for repeat ingests
