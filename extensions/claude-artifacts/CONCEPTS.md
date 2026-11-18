# Concepts

Shared domain vocabulary for this project — entities, named processes, and status
concepts with project-specific meaning. Seeded with core domain vocabulary, then
accretes as ce-compound and ce-compound-refresh process learnings; direct edits
are fine. Glossary only, not a spec or catch-all.

## Artifacts

### Artifact

A web page published from a Claude Code session and hosted at a stable URL, which
this project treats as a durable, findable document rather than a chat byproduct.

*Avoid:* Chat artifact — a separate system with no sanctioned programmatic access.

Identified here by the last segment of its URL. That segment is opaque — its format
has changed once already, and it is not the same value as the internal id the
publishing tool reports alongside it, so treating either as derivable from the other
is a mistake this project has made. Republishing an Artifact appears to reuse its URL
rather than mint a new one — observed rather than contractual, which is why every write path here
upserts on identity instead of appending. An Artifact's human-facing title is not
authoritative: the publishing tool reports the source filename, so the useful title
comes from the publish-time description.

### Owner

Whether the authenticated user created an Artifact or merely has access to one
shared with them. Only two values exist, and they are not symmetric: a shared
Artifact carries no update date at all, so anything that sorts or displays by
recency must treat absence as a normal case rather than as missing data.

### Project

The working directory an Artifact was published from, reduced to its last path
segment and used as the Artifact's grouping label.

Free to capture at publish time and impossible to reconstruct afterwards — nothing
in the published Artifact records where it came from. A Project label may therefore
be absent on any Artifact recorded by other means, and the directory it names may
no longer exist by the time anyone acts on it.

## The Index

### Index

The local file that mirrors which Artifacts exist, and the only thing this
project's search reads. It is a mirror, not a source of truth: it holds what was
observed at publish time and can drift from the real gallery, because renames and
deletions elsewhere never propagate to it.

Carries a schema version so a future reconcile pass can migrate it rather than
guess. Readers of the Index are deliberately forgiving — an unusable row is
skipped rather than allowed to blank the whole list — and its rows are
de-duplicated on Artifact identity, last write winning.

### Recording Hook

The process that observes each publish and upserts the corresponding row into the
Index. It is the Index's only *routine* writer; a Backfill writes it too, but only
when someone asks for one (see Backfill, Seeded Row).

Governed by one overriding constraint: it must never block or fail the session it
observes, so every outcome — success, contention, missing dependency, malformed
input — is non-fatal and silent. That constraint is what makes correctness hard
rather than easy: a failure here cannot announce itself, so the hook must not lose
a write it believed it made. Publishes arrive in bursts, so concurrent invocations
are the normal case and mutual exclusion is a requirement rather than a
precaution. See
`docs/solutions/design-patterns/lockfile-mtime-cannot-prove-liveness.md`.

### Transcript

The local, per-session record of everything a Claude Code session did, and the only
witness to a publish other than the Index itself.

Because the Recording Hook cannot announce its own failures, the Transcript is what
makes a missed publish recoverable at all. It is an append-only byproduct nobody
curates, so it accumulates indefinitely and a scan of it is a scan of the whole
history — but it records each instant in UTC and never the publisher's local offset,
so a calendar date recovered from it resolves in whatever timezone the Backfill runs
in, and can land a day off from what the Recording Hook wrote at the time.

### Backfill

Reconstructing Index rows for publishes the Recording Hook failed to observe, by
scanning Transcripts.

Strictly additive: it inserts rows whose identity the Index lacks and never modifies
or removes one that is already there, because the Index holds Seeded Rows that no
Transcript can reproduce. It contends with the Recording Hook for the same Index and
so must take the same lock rather than a scheme of its own — two different locking
schemes exclude nothing.

### Seeded Row

An Index entry taken from a listing of already-published Artifacts rather than
observed at publish time. Not the product of a Backfill, which reads Transcripts.

Distinguishable in practice by what it lacks: no originating directory, therefore
no Project label, and no way to acquire either later. Seeding exists because the
Recording Hook can only capture Artifacts published after it is installed.

## Flagged ambiguities

- "backfill" had been used for both the one-time seeding of pre-existing Artifacts
  and the Transcript-scanning recovery of missed ones — these are distinct. Seeded
  Row is the first; Backfill is the second.
