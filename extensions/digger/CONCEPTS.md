# Concepts

Shared domain vocabulary for this project — entities, named processes, and status
concepts with project-specific meaning. Seeded with core domain vocabulary, then
accretes as ce-compound and ce-compound-refresh process learnings; direct edits are
fine. Glossary only, not a spec or catch-all.

## The dig

**Dig** — one complete analysis of a single URL: fetching the page, parsing it, and
running every auxiliary lookup, presented as one result the user reads section by
section.

A dig is the unit of work, of caching, and of cancellation. Starting a dig while one is
in flight supersedes the older one rather than queuing behind it. A dig is reported as
finished when the main fetch and every auxiliary lookup has settled — succeeded or
failed — not when the first data appears on screen.

**Auxiliary lookup** — a check that runs alongside the main page fetch and enriches the
result without being required for it: name resolution, certificate inspection, archive
history, host metadata, and the well-known text resources.

Each one owns its failure. An auxiliary lookup that fails degrades its own section and
never fails the dig, so a page that loaded fine still renders even when several lookups
did not answer. The corollary is that a failure has to be *reported* somewhere, because
nothing else in the dig will surface it — a silently swallowed lookup is
indistinguishable from one that succeeded and found nothing.

**Supersession** — the replacement of an in-flight dig by a newer one for a different
URL.
*Avoid: cancellation.*

Supersession and self-cancellation both abort the same work, and telling them apart is
the distinction that matters: a superseded dig must stop writing to the view, while a
dig that aborted because its own request failed must still report that failure. Asking
whether the work was aborted answers neither question — the test is whether this dig is
still the current one.

## Result states

**Resource status** — the reported outcome of a single auxiliary lookup, which is
three-valued: the thing was found, the server answered that it does not exist, or the
check could not be completed.

The third state is the load-bearing one. *Absent* is an answer and *unavailable* is a
reason to retry, and collapsing them into a boolean forces every failure to render as
"not found" — a claim about the world made from a request that never got one. Any
lookup whose outcome reaches the UI carries all three states, and a fallback value
substituted on failure is a fourth state in disguise: a fabrication that the type
system cannot distinguish from data.

**Partial failure** — a dig in which the page loaded but one or more auxiliary lookups
did not answer.

This is the normal degraded state, not an error state. The dig still returns a result,
each failed section says so in place, and the failure travels with the cached result so
that re-reading it later still explains itself rather than presenting the gaps as
findings.

Reporting is two-tier, and the tiers are not interchangeable. Every failure is reported
**in place**, on the row it belongs to. Only the loss of a whole subsystem — name
resolution, the certificate, archive history, host metadata — also **interrupts** with a
toast. A single unreachable file inside a section stays in that section, because the
reader reviews sections one at a time and an interruption that fires for details is one
they learn to dismiss.
