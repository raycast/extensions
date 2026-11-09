# Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add read-only AI listing/search and exact-record retrieval with pagination and history.
- Add explicit paired-extension handoff review with source identity and snapshot digest.
- Validate full ledger shapes, report unreadable records, and prevent ID overwrites.
- Add regression coverage for corruption, concurrency, retrieval, and handoff tampering.
- Preserve empty evidence columns and unchanged evidence IDs during correction.

- Add portable local Ground Packet creation, browsing, correction, and export.
- Add non-persistent drafting and one-question context-gap AI tools.
- Add a human-confirmed local-save AI tool.
- Preserve an open, versioned JSON format with bounded candidate-only Ubiquity compatibility.
- Add representative mock outputs for all three AI tools.
- Strengthen eval inputs with complete synthetic context and authority boundaries.
- Include eval coverage for all three tool-selection routes.
- Add Raycast AI draft and native save-confirmation proof screenshots.
- Move user-deleted packet versions to the recoverable system Trash.
- Serialize lineage corrections and reject stale forms before they can fork version history.
