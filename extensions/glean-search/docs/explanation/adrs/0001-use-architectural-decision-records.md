---
status: accepted
date: 2026-06-26
decision-makers: faizhasim
---

# Use Markdown Architectural Decision Records (MADR)

## Context and Problem Statement

We want to record architectural decisions made in this project. These decisions may concern the architecture, code design, library choices, workflow conventions, or other significant project aspects.

Which format and structure should these records follow to be clear, maintainable, and easy to contribute to?

## Decision Drivers

- Decisions should be documented in a lightweight, human-readable format that renders well on GitHub
- The format should be structured enough to capture context, rationale, and trade-offs
- Adopting a well-known convention lowers the barrier for contributors
- The format should be tool-agnostic and work with plain text editors

## Considered Options

- **MADR** — Markdown Architectural Decision Records, an established template with community adoption
- **Michael Nygard's template** — The original ADR format from 2011 (Title, Status, Context, Decision, Consequences)
- **Y-Statements** — A concise format: "In the context of ... facing ... we decided for ... to achieve ... accepting ..."
- **Formless** — No conventions for file format and structure; free-form documentation in any format

## Decision Outcome

Chosen option: **MADR**, because:

- The structured sections (context, decision drivers, considered options, pros/cons) encourage thorough thinking
- MADR is lean and fits our development style without excessive ceremony
- The format is well-documented and widely adopted in the open-source community
- Markdown works natively with GitHub and renders beautifully
- The template includes explicit sections for trade-off analysis, which is crucial for understanding why a decision was made

### Consequences

- Good, because every significant decision will be documented with clear rationale, making the project more accessible to new contributors and future maintainers
- Good, because the structured format makes it easy to review, discuss, and supersede decisions over time
- Bad, because there is an overhead to writing an ADR for every significant decision, which may slow down rapid prototyping if applied too aggressively
- Bad, because ADRs need to be kept in sync with reality — a decision that is later reversed should be explicitly superseded

### Confirmation

Each ADR is reviewed as part of the pull request process. Decisions are revisited when new context emerges, and old ADRs can be superseded by new ones following the same format. A decision is considered implemented when the described approach is reflected in the codebase and/or project workflows.

## Pros and Cons of the Options

### MADR

The [Markdown Architectural Decision Records](https://adr.github.io/madr/) template — structured, Markdown-based, with explicit sections for decision drivers, options, and trade-offs.

- Good, because it provides a comprehensive yet lightweight template
- Good, because it has strong community adoption and an active maintainer
- Good, because it separates concerns into well-defined sections (drivers, options, pros/cons, consequences)
- Neutral, because some sections may feel verbose for trivial decisions
- Bad, because the full template can feel daunting for first-time users

### Michael Nygard's template

The original ADR format: Title, Status, Context, Decision, Consequences — described in a 2011 blog post.

- Good, because it is the simplest possible ADR format
- Good, because it is widely recognised and understood
- Bad, because it lacks explicit guidance for documenting alternatives and trade-offs
- Bad, because the minimal structure may lead to shallow documentation

### Y-Statements

A single-sentence format: "In the context of ... facing ... we decided for ... to achieve ... accepting ..."

- Good, because it forces concise, precise documentation
- Good, because it works well for straightforward decisions
- Bad, because it does not naturally accommodate multiple alternatives or detailed trade-off analysis
- Bad, because complex decisions with many drivers are hard to capture in a single sentence

### Formless

No conventions at all — decisions are documented in whatever format seems fit at the time.

- Good, because there is zero overhead to start documenting
- Bad, because inconsistency makes it hard to find, compare, and understand past decisions
- Bad, because without a template, important sections (rationale, alternatives, consequences) are often skipped

## More Information

This ADR is adapted from the [official MADR project template](https://github.com/adr/madr/blob/main/template/0000-use-markdown-architectural-decision-records.md). For more on ADR best practices and tooling, see:

- [MADR website](https://adr.github.io/madr/)
- [ADR GitHub organization](https://adr.github.io/)
- [MADR Template Primer](https://ozimmer.ch/practices/2022/11/22/MADRTemplatePrimer.html)
