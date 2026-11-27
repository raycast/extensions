# Validation — 2026-11-09 UTC

- Runtime: Node 22.22.2, Raycast API 1.104.22; current main Raycast is the installation target.
- TypeScript: passed.
- Vitest: 20/20 passed.
- Raycast lint: passed, including authenticated manifest, icon, metadata, ESLint, and Prettier checks.
- Distribution build: passed with extracted schemas for every AI tool.
- Remote Raycast AI evals: 7/7, 100%, using synthetic tool mocks. These validate model/tool routing and response assertions, not live persistence or source truth.
- Regression cases cover malformed and incomplete records, filename identity, no-overwrite publication, unavailable vs empty ledgers, pagination/history, exact-ID retrieval, handoff identity/digest tampering, and correction/evidence behavior.

The exFAT source checkout contains macOS AppleDouble sidecars. Validation and publication use a clean local staging copy without these sidecars; no dependency tree is copied. Tests and ESLint also exclude sidecars explicitly.

The initial `meetsCriteria` assertion failed because the remote grader returned HTTP 401 with `x-bt-error-origin: braintrust`. It was replaced with deterministic warning/no-fabrication response checks. Array equality in the remote argument matcher also rejected visibly matching arrays; element/length assertions now exercise the same requirement. These observations do not establish the cause of the older reviewer's failure report.

The CLI can report exit zero on build/eval failure; per-case scores and actual build output were inspected. No private user records were sent to evals. Installed-private-copy verification is recorded separately after publication.
