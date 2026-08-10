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

Identified by a UUID that also determines its URL, so the URL and the identity are
the same fact. Republishing an Artifact appears to reuse its URL rather than mint a
new one — observed rather than contractual, which is why every write path here
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
Index. It is the Index's only *ongoing* writer — the one-time seed that backfills
pre-existing Artifacts is the only other thing that writes it (see Seeded Row).

Governed by one overriding constraint: it must never block or fail the session it
observes, so every outcome — success, contention, missing dependency, malformed
input — is non-fatal and silent. That constraint is what makes correctness hard
rather than easy: a failure here cannot announce itself, so the hook must not lose
a write it believed it made. Publishes arrive in bursts, so concurrent invocations
are the normal case and mutual exclusion is a requirement rather than a
precaution. See
`docs/solutions/design-patterns/lockfile-mtime-cannot-prove-liveness.md`.

### Seeded Row

An Index entry backfilled from a listing of already-published Artifacts rather
than observed at publish time.

Distinguishable in practice by what it lacks: no originating directory, therefore
no Project label, and no way to acquire either later. Seeding exists because the
Recording Hook can only capture Artifacts published after it is installed.
