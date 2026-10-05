# Storage Benchmark — MVP specification

## Product

Build a public, MIT-licensed, macOS-only Raycast Store extension named **Storage Benchmark**. It provides a conservative, explicitly confirmed check of sequential storage performance. It is inspired by the simplicity of dedicated storage-benchmark applications, but does not copy their branding, visuals, methodology, or promise numerically equivalent results.

The extension exposes two Raycast commands:

1. **Run Storage Benchmark** — runs the benchmark, displays live phase/progress, supports cancellation, and presents results.
2. **View Storage History** — groups bounded local history by volume and manages baselines.

## Measurement

- Measure sequential write and sequential read throughput in decimal MB/s.
- Run only against a writable directory on a mounted local volume. Network and cloud-backed locations are outside v1.
- Default to a private benchmark directory under the user's home directory; remember a user-selected destination.
- Use a small Swift package compiled from source by Raycast's native extension tooling. It owns measurement, uncached macOS file I/O, aligned buffers, temporary-file lifecycle, signal-aware cancellation, and an extensible benchmark-case protocol.
- Return the validated result through Raycast's generated Swift bridge and publish live progress through versioned JSON snapshots in a private per-run transport directory.
- Write deterministic high-entropy pseudo-random bytes so compression cannot make the result misleading and random generation does not become the bottleneck.
- Use a short warm-up followed by one measured sample. A second bounded sample is allowed only when observed variance is unusually high.
- During prototype calibration, test caps from 256 MiB through 2 GiB. Select the smallest cap that produces stable results on representative storage. Keep ten seconds as the absolute time ceiling and allow explicitly selected sustained-transfer caps up to 25 GiB.
- Compare results only when methodology version, workload, and material configuration match.
- Keep raw block devices, privileged I/O, SMART data, random I/O, latency suites, network storage, and cloud storage outside v1.

## Interpretation and history

- Show separate read and write results plus an overall task-oriented tier limited by the weaker direction.
- First-run tiers are approximate task examples, not codec guarantees or hardware-health claims.
- Show measurement confidence. Preserve unstable results and recommend a rerun.
- Store the last 20 successful compatible results per volume locally, plus a small separate record of recent failures and cancellations.
- The first successful result becomes a provisional baseline. Confirm it after a reasonably close compatible result; do not normalize a sustained slowdown into a rolling baseline.
- A single slow result is labelled lower than baseline and requests confirmation before being described as consistent.
- Allow rerun, baseline replacement/reset, individual-run deletion, and per-volume-history deletion.
- Store only volume identity/display name, metrics, timestamps, test configuration, completion state, and minimal diagnostic errors. Do not retain filenames, test contents, or telemetry.

## UX and safety

- Use a Raycast-native view rather than custom speedometer gauges.
- Show the selected destination, data limit, time target, and temporary-write safeguards before every run. Opening the command must never start I/O automatically.
- Let users press Enter on the destination, data-limit, or time-target row to change that value, return to review, and explicitly start the run only after confirming the complete setup.
- Provide actions for cancel, rerun, change destination, history, preferences, and methodology help where relevant.
- Refuse to run when required temporary space plus a safety margin is unavailable. Never silently shrink a comparable test.
- Cancelling creates a private marker checked between I/O chunks; dismissing the command also lets Raycast signal the native process. Both paths remove the temporary file.
- The native benchmark cleans up on success, error, cancellation, and handled signals. The extension performs exact parent-side cleanup and defensive startup cleanup only for positively identified stale files created by this extension.
- Request only access needed for the selected destination. Explain permission failures contextually; do not require Full Disk Access by default.

## Architecture and test seams

The confirmed public seams for test-driven development are:

1. **Native benchmark API:** a Raycast-generated Swift function bridge plus versioned progress snapshots, including cleanup and cancellation outcomes.
2. **TypeScript benchmark engine:** invokes the Swift API, polls progress, creates cancellation markers, validates native results, and hides transport details from UI commands.
3. **History and interpretation:** per-volume persistence, compatible-baseline rules, confidence, change classification, and task tiers.

The Swift source and pinned package resolution are committed with the extension. Raycast compiles the native executable during the extension build; no precompiled executable is committed. Raycast UI, preferences, suite selection, history, and interpretation remain in TypeScript.

## Acceptance and release

- Under stable conditions, repeated prototype runs should target approximately 5% variance and correctly distinguish meaningfully different storage devices.
- Validate built-in storage and available representative fast/slow external storage. Document hardware categories that could not be tested.
- Verify permission denial, low space, explicit cancellation, view dismissal, helper failure, malformed protocol, and stale-file recovery.
- Run Swift and TypeScript unit/integration tests, typechecking, Raycast lint, and the Raycast distribution build.
- Prepare a Store-ready branch and checklist. Do not open a public Raycast Store pull request without explicit user approval.
