# Worktodo SQLite Runtime Validation

**Validated:** 2026-08-28 on macOS 26.6.1 (25G76), Raycast 2.1.1.0, and `@raycast/api` 2.0.5.

**Outcome:** All 13 native checks passed. At validation time, the automated suite separately passed 22 tests, including MCP stdio and the task-model schema. This evidence validated the temporary harness and proposed schema design before product persistence was implemented.

## Runtime and connection policy

| Process           | Node    | SQLite | Journal | Synchronous | Foreign keys | Busy timeout |
| ----------------- | ------- | ------ | ------- | ----------- | ------------ | ------------ |
| Raycast           | 22.22.2 | 3.51.2 | DELETE  | FULL (2)    | Enabled      | 2,000 ms     |
| Companion runtime | 24.18.0 | 3.53.1 | DELETE  | FULL (2)    | Enabled      | 2,000 ms     |

Raycast's application version advanced since the scaffold check; its embedded Node and SQLite versions still match the expected baseline. Connections disable extensions and double-quoted string literals; automated tests verify rejection.

## Native evidence

Concurrency session: `9b3c07aa-980b-44dd-9ed4-16723a017333`, 12:42:51–12:43:04 UTC.
Task-model session: `5fe15631-b8e0-41e3-94c4-371a2f0e0407`, 06:25:48–06:26:11 UTC.

| Scenario                                          | Measured result                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Read during an uncommitted write, both directions | Readers saw zero uncommitted rows                                                                          |
| Raycast waits for Node 24, short hold             | Committed in 361.6 ms                                                                                      |
| Node 24 waits for Raycast, short hold             | Committed in 362.2 ms                                                                                      |
| Raycast waits for Node 24, long hold              | SQLITE_BUSY after 2,086.2 ms                                                                               |
| Node 24 waits for Raycast, long hold              | SQLITE_BUSY after 2,096.8 ms                                                                               |
| Competing migrations                              | Raycast applied once; Node waited 366.9 ms, then read version 1 under its lock and no-opped; one audit row |
| Foreign-key violations, both runtimes             | Rejected with SQLITE_CONSTRAINT_FOREIGNKEY                                                                 |
| Proposed task-model schema, both runtimes         | Identical version-1 `STRICT` schema evidence; valid states round-tripped and nine invalid cases rejected   |
| Raycast transaction exception                     | Explicit rollback; row absent; no open transaction                                                         |
| Node writer killed with SIGKILL                   | Uncommitted row absent; integrity/FK checks passed; hot journal removed                                    |
| Online backup with an active Raycast reader       | Verified read-only by both runtimes; matching four markers and one migration audit row                     |
| Final database state                              | Integrity `ok`; zero FK violations; no WAL, SHM, or rollback-journal sidecars                              |

Both migration contenders acknowledge readiness before starting. The holder acquires its transaction before the waiter signals its attempt; release follows 356 ms later. The waiter must demonstrate at least 200 ms of lock waiting and re-read `user_version` inside the acquired transaction. Sequential execution cannot pass.

An earlier native run exposed an inadequate crash probe: the writer left an inactive, zero-header journal because its changes had not spilled to disk. The corrected probe uses a small cache only in the crash worker, verifies the journal header before SIGKILL, and tests actual recovery. No journal is manually deleted. An earlier launch also timed out at Raycast's confirmation prompt before any database checks.

Raw temporary reports and databases were not retained in the repository. The measured summary above is the durable evidence from that validation run.

## Approved storage policies

- Use DELETE journal mode, synchronous FULL, enabled foreign keys, and disabled extensions/DQS. WAL remains prohibited while Raycast embeds SQLite 3.51.2.
- Adopt a 2,000 ms busy timeout provisionally. Observed timeout completion was approximately 2.1 seconds; this is not a hard real-time deadline.
- Use short BEGIN IMMEDIATE writes with explicit commit and rollback on failure. Never hold transactions across user interaction, network access, or agent work. Deliberate holds belong only to this harness.
- Lock migrations before reading `user_version`; apply and commit each migration once. The async synchronization hooks are experimental, not a production migration framework.
- Back up with `node:sqlite`, verify a new sibling candidate read-only, then publish with an atomic hard link. EEXIST is a conflict, never permission to replace a destination. Clean up only the current attempt's candidate.
- Bound the peer by its ten-minute session deadline. Polling and marker waits reject expired sessions; expiry rolls back held transactions and is reported as failure.

## Archived harness

The temporary Raycast command, coordinator, and synthetic spike tests were removed after production persistence and the shared task domain shipped. The measured results above remain the durable native evidence; the temporary session path may no longer exist.

Run `npm run verify` for current production database, migration, domain, query, presentation, and MCP regression coverage. The retained connection and migration tests enforce the approved policies against the shipped implementation. The Project, Label, Task, note, lifecycle, priority, due-value, Today, and relational contracts remain defined in the [shared task model](task-model.md).
