---
title: "A lockfile mtime cannot tell a dead holder from a slow one"
module: scripts/record-artifact.sh
date: 2026-07-25
problem_type: design_pattern
category: design-patterns
component: tooling
severity: high
related_components:
  - development_workflow
  - testing_framework
applies_when:
  - "Serialising concurrent read-modify-write on a shared file from a shell hook or script"
  - "Reaching for an mtime/age-based stale-lock reaper because the platform lacks `flock(1)`"
  - "A concurrency fix is about to be declared verified because a burst test came back green"
  - "Choosing a mutual-exclusion primitive that must survive a holder killed by SIGKILL, sleep, or paging"
symptoms:
  - "only 3 of 12 concurrent hook invocations landed with atomic temp-file + `mv` (no corruption, just lost updates)"
  - "38 of 40 entries written at 40-way concurrency while the log claimed all 40 were recorded"
  - "Raising the stale-lock threshold 60s to 10min turned the test green without closing the race window"
  - "Age-based reaper removed live locks; deleting the reaper deadlocked any writer killed mid-critical-section instead"
root_cause: async_timing
resolution_type: code_fix
tags:
  - file-locking
  - flock
  - lost-update
  - concurrency-testing
  - stale-lock-reaper
  - claude-code-hooks
  - shell-scripting
  - macos
---

# A lockfile mtime cannot tell a dead holder from a slow one

## Problem

`scripts/record-artifact.sh` is a Claude Code `PostToolUse` hook (bash + jq) that
upserts one row into `~/.claude/artifacts.json` on every artifact publish. It is
the only writer at publish time — a one-time seed may backfill the file
beforehand, but nothing else writes it while the hook runs — and the write is a
read-modify-write: `jq` reads the whole index, emits a new document with the row
upserted, and the result replaces the file (`scripts/record-artifact.sh:224-255`).

Artifacts publish in bursts — a session that republishes a page four times, or
several sessions publishing at once — so multiple hook processes run the same
read-modify-write concurrently. Concurrent read-modify-write on a single file is
the textbook lost-update setup: two processes read the same document, each adds
its own row to that snapshot, and the second `mv` overwrites the first writer's
row.

The hook also operates under a hard constraint that shapes every option: it must
never block or fail a real Claude Code turn (`scripts/record-artifact.sh:23-25`).
Every path exits 0. That rules out "fail loudly and let the user retry" as a
resolution for lock contention, and it is why an unbounded wait is not acceptable
either.

## Symptoms

- Publishing several artifacts in quick succession recorded fewer rows than
  publishes that occurred. The measured baseline with an atomic `mv` but no lock:
  **3 of 12 concurrent writes landed — 9 lost.**
- **The hook log said the writes succeeded.** After adding a lockfile-based lock,
  a 40-way concurrency run logged 40 rows recorded while the index contained 38.
  Nothing errored, nothing warned, no path exited non-zero — the component
  reported success and lost data.
- The failure was load-dependent and therefore absent from normal use. A single
  publish, or two spaced a second apart, always worked.

## What Didn't Work

Four iterations, each of which looked correct and two of which produced clean
measurements — then the review that ended them.

**1. Atomic `mv` alone.** Write to a temp file, `mv` it over the index. This is
necessary — it is why `mv -f` still appears at `scripts/record-artifact.sh:255`
and why first-index creation was later fixed to use temp+rename
(`scripts/record-artifact.sh:212-216`) — but it solves the wrong problem. Atomic
rename guarantees a reader never sees a half-written file. It says nothing about
two writers whose reads interleaved before either rename. Measured: **3 of 12
concurrent writes landed.**

**2. `mkdir` lock plus an age-based stale-lock reaper.** `mkdir` is the portable
atomic test-and-set available in POSIX sh, and macOS ships no `flock(1)`, so this
is the design most guides recommend. It needs a reaper, because a hook killed
mid-critical-section leaves a lock directory nothing will ever remove, and every
later publish is silently dropped — so a `find -mmin`-based sweep deleted locks
older than 60 seconds. Measured: 12/12 at 12-way concurrency, but **38 of 40 at
40-way, while the log claimed 40 recorded.**

**3. Diagnosis by subtraction.** Removing the reaper produced 40/40 across three
runs. That localised the loss precisely: the reaper was deleting locks whose
owners were still alive and inside the critical section. But removing it is not a
fix — it reinstates the deadlock the reaper existed to prevent.

**4. Raising the threshold, 60s → 10min, gated to attempts past ~45 of 50.**
Measured: **40/40, three times.** This was declared fixed and verified, with real
numbers behind it. It was still broken.

**5. An independent adversarial review found the flaw was conceptual, not
numeric.** A lockfile's mtime tells you how old the lock is. It never tells you
whether the process holding it is alive. A writer that is merely *suspended* —
SIGSTOP, laptop sleep, heavy paging, a scheduler that descheduled it under load —
is byte-for-byte indistinguishable from a writer that died. So *any* threshold,
at any value, can steal a live lock. The 10-minute threshold did not close the
window; it moved the window past what the test harness was capable of producing.
The green measurement was evidence about the test, not about the code.

Both bad designs passed their tests. That is the load-bearing fact of this entry.

## Solution

Replace the lockfile with a **kernel-backed advisory lock** — `flock(2)`, held by
a `perl` process for exactly the lifetime of the critical section. macOS has no
`flock(1)` binary but does ship perl, whose `flock` is the syscall
(`scripts/record-artifact.sh:147-148`).

The whole read-modify-write moved *inside* the lock holder. `perl` opens the
lockfile, takes `LOCK_EX`, and then runs the critical section as a child `sh -c`,
so the lock is held for precisely as long as the work takes
(`scripts/record-artifact.sh:190-205`):

```perl
use Fcntl qw(:flock);
my ($lockfile, $timeout, $script) = @ARGV;
open(my $fh, ">>", $lockfile) or exit 75;
eval {
  local $SIG{ALRM} = sub { die "timeout\n" };
  alarm $timeout;
  flock($fh, LOCK_EX) or die "flock\n";
  alarm 0;
  1;
} or exit 75;
# Lock held for the lifetime of this process; the kernel drops it on exit,
# including SIGKILL. Nothing to clean up, no stale lock to reap.
my $rc = system("/bin/sh", "-c", $script);
exit($rc == 0 ? 0 : 1);
```

There is no reaper, no threshold, and no cleanup path, because there is nothing
to clean up. `alarm $timeout` bounds only the *wait* — `LOCK_TIMEOUT=10`
(`scripts/record-artifact.sh:170`) — so a genuinely stuck holder degrades to one
skipped record rather than a hung Claude Code turn. Exit codes are distinct so
the log can tell the three outcomes apart (`scripts/record-artifact.sh:181`,
`scripts/record-artifact.sh:260-263`):

```bash
case "${LOCK_STATUS}" in
  0) log "recorded ${ID} (${TITLE}) project=${PROJECT:-none}" ;;
  75) log "could not acquire lock within ${LOCK_TIMEOUT}s; skipped ${ID}" ;;
  *) log "write failed for ${ID}; index left unchanged" ;;
esac
```

**Fallback: no perl ⇒ log and skip** (`scripts/record-artifact.sh:172-175`).
Writing unserialised would be worse than not writing. A lost row beats a corrupt
index, and the hook's no-fail contract forbids surfacing it as an error.

Two related defects were fixed in the same review pass, both secondary to the
lock story but real:

- **First-index creation was not atomic.** A direct redirection could be
  interrupted mid-write and leave a malformed file that later runs would never
  repair, because they only tested for non-emptiness. Now temp+rename, matching
  the update path (`scripts/record-artifact.sh:212-216`).
- **The upsert did not collapse pre-existing duplicate ids.** A file that already
  contained two rows for one id — hand-edited, or written by an older
  append-only version — had every copy updated in place and stayed duplicated.
  The upsert now partitions on id, merges the matches into one canonical row, and
  reassembles (`scripts/record-artifact.sh:245-250`).

## Why This Works

The kernel owns the lock, not the filesystem. `flock(2)` is associated with an
open file description in a live process, so the kernel releases it when that
process exits — normal exit, `exit 1`, SIGTERM, SIGKILL, crash, OOM kill. Death
is the release condition, and the kernel is the only party that actually knows
whether a process is alive.

That single property eliminates both failure modes of the lockfile design at
once, without a tunable:

- **No lost updates.** Nothing can steal the lock from a live holder, whether
  that holder is fast, slow, or SIGSTOPped for an hour. Suspension is no longer
  confusable with death, because nothing is inferring liveness from a timestamp.
- **No deadlock.** A SIGKILLed holder releases immediately, so there is no
  abandoned lock to reap and therefore no reaper to get wrong.

The mtime-based design was being asked to answer "is the owner alive?" using data
that does not contain the answer. No threshold fixes an unanswerable question —
it only trades the lost-update rate against the deadlock window. The
kernel-backed lock replaces the inference with a fact.

**Verified (this session's measurements, 2026-07-25):**

| Scenario | Result |
| --- | --- |
| 40-way concurrent publish, three runs | 40/40 rows each run |
| SIGKILL the lock holder | next writer acquires in **0s** (the reaper design stalled for the full threshold) |
| Live-but-SIGSTOPped holder | correctly waited on, never stolen |

The SIGSTOP case is the one that matters most: it is the case the reaper design
failed and no prior test had attempted.

## Prevention

**Interrogate the primitive's mechanism before you measure it.** The question that
would have skipped iterations 2 through 4 is one sentence long: *can this
primitive distinguish a dead holder from a slow one?* A lockfile cannot. Ask it
of any lock before writing a test:

- Does the primitive know whether the holder is alive, or is it inferring
  liveness from something correlated with it (mtime, a PID file, a heartbeat
  timestamp)? Inference means a threshold, and a threshold means a window.
- Does the kernel release it on process death, for **all** causes of death
  including SIGKILL? If cleanup requires the holder to run code — a `trap`, a
  `defer`, an `atexit` — then SIGKILL skips it and you need a reaper, which puts
  you back in the same trap.
- If the answer to either is no, the design has an unfixable window. On macOS,
  `perl -e 'flock'` is the portable escape hatch when `flock(1)` is absent. On
  Windows the equivalent is an exclusive `FileStream` with
  `[System.IO.FileShare]::None`, which the OS also releases on process death.

**A green concurrency test is weak evidence.** Both bad designs passed. "Measured
40/40" proved the test was too fast to trip the window, not that the window was
gone. Tuning a threshold until the suite goes green is optimising the test's
blindness. A concurrency test worth trusting has to be *able* to fail:

- **Vary timing rather than repeating one fast burst.** Insert random sleeps
  inside the critical section; the fixed-duration burst is exactly the shape that
  hides an mtime race.
- **SIGSTOP a holder mid-critical-section** and assert no other writer proceeds.
  This is the test that separates a live holder from a dead one, and it is the
  test the reaper design cannot pass at any threshold.
- **SIGKILL a holder mid-critical-section** and assert the next waiter acquires
  promptly. This catches the opposite failure — a reaperless lockfile deadlocks
  here, and a threshold-based one stalls for the whole threshold.
- **Assert on the persisted state, never on the log.** Count rows in the file and
  compare to publishes attempted. "Log said 40, file had 38" was findable only by
  counting rows; every self-report agreed the work had succeeded.

**A component reporting success while losing data is the tell worth teaching.**
The lockfile hook logged `recorded` for all 40 writes because from inside each
process the write *did* succeed — it wrote a complete document via an atomic
rename, and nothing it could observe told it the document was built from a stale
read. Any success message emitted by a participant that cannot see the other
participants is a claim about local intent, not about the outcome. Instrument the
outcome: make the log distinguish outcomes it can actually distinguish
(`scripts/record-artifact.sh:260-263` separates recorded / lock-unavailable /
write-failed), and verify the aggregate independently.

**"Fixed and verified" was declared twice, with real measurements both times.**
What broke the loop was an independent adversarial review reasoning about the
mechanism rather than re-running the harness — the author's own tests could not
falsify the author's own model. For anything concurrent, ship the mechanism
argument alongside the numbers, and have someone attack the argument. The numbers
cannot check themselves.

The reasoning is preserved next to the code so it does not get "simplified" back
into a reaper — see the comment block at `scripts/record-artifact.sh:142-168`.
A PowerShell port of the hook is a pending idea (`README.md`), and it carries the
same warning: do not reimplement the reaper.

The hook is currently unreleased outside this repo; the extension's Store
submission is pending as `raycast/extensions#29733`.

## Related

- [`docs/hook-payload.md`](../../hook-payload.md) — the empirically captured
  `Artifact` `PostToolUse` payload shape this hook parses, and the `$HOME`
  expansion finding. Points here for the locking rationale.
- `scripts/record-artifact.sh:142-168` — the design rationale, kept next to the
  code so the reaper does not get reintroduced as a simplification.

**On reproducing the measurements above:** the concurrency harness was ad-hoc —
N backgrounded invocations against a throwaway `$HOME`, then a row count compared
against N — and is *not* committed. `scripts/probe-artifact-hook.sh` is unrelated
to it: that tool captures a single live payload and does not exercise
concurrency. Anyone re-verifying should expect to rebuild the harness from the
Prevention section's four tests rather than find it in the repo.
