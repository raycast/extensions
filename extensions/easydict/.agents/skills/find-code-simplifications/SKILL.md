---
name: find-code-simplifications
description: Investigate a branch, module, or repository for non-obvious, evidence-backed code simplification opportunities such as dead surfaces, duplicated state, speculative abstractions, redundant lifecycle machinery, and hand-rolled infrastructure. Use when the user explicitly asks for a broad code simplification investigation rather than an ordinary PR review or routine final check.
---

# Find Code Simplifications

Find a few meaningful simplifications with strong evidence. Follow the code and its contracts, keep judgment active, and prefer net reductions in concepts and maintained surface area over cosmetic line-count wins.

## Establish The Investigation

1. Determine the requested scope: a branch or PR diff, named modules, or the whole repository.
2. For branch work, establish a fixed comparison base from the user's target, PR metadata, or the verified merge base. Include staged, unstaged, and relevant untracked work when the request covers the current working tree.
3. Read the repository instructions and the architecture, testing, dependency, compatibility, and design-decision documents that govern the selected scope.
4. Inspect the working tree before proceeding and preserve unrelated user changes.
5. Begin read-only. Produce findings first; edit code only when the user explicitly asks for implementation.

Complete this stage when the scope, comparison point, applicable rules, and mutation boundary are explicit.

## Identify Strong Candidates

Look for simplifications where the current design costs more than it buys:

- A public method, event, configuration option, helper, package, registry entry, or test artifact has no production consumer.
- Tests or documentation are the only consumers, and the behavior they preserve is not load-bearing.
- Multiple representations, caches, flags, or events mirror the same fact.
- An interface or abstraction forces implementations to support capabilities no production caller uses.
- A wrapper, package, layer, or registry adds indirection without owning policy, state, translation, or lifecycle.
- A feature carries speculative generality for scenarios with no current product or platform owner.
- An invariant, rollback path, expected-output corpus, or special-case test exists only to protect an unused surface.
- Code added and later removed left compatibility branches, configuration, migrations, documentation, snapshots, or tests behind.
- Hand-rolled infrastructure duplicates a standard-library feature or a well-maintained dependency and replacement would produce a real net deletion.
- Similar branches, adapters, commands, or data transformations can share one source of truth without hiding meaningful differences.

Treat typo fixes, formatting, isolated renames, and tool-only unused-symbol reports as thin candidates unless they expose a larger simplification.

## Survey Broadly

For a broad request, divide the repository by meaningful ownership or runtime domains and inspect them in parallel when subagents are available. Derive domains from the repository rather than assuming a language or architecture.

Start with the largest or most complex production surfaces in scope. Follow high-churn files, central abstractions, duplicated lifecycle code, public interfaces, and configuration paths before stopping at obvious unused symbols. Do not let the first plausible candidate end the survey.

Static-analysis tools may generate leads. Treat their output as evidence to investigate, not as proof, because dynamic loading, dependency injection, reflection, generated code, configuration, serialization, wire strings, and external consumers may hide real usage.

## Audit Trust And Lifecycle Boundaries

For every defensive copy, validator, freeze, callback capture, or normalization layer, identify where the value originates and who owns it next. Preserve validation at trust boundaries such as parsers, configuration loaders, queues, model or tool input, durable storage, workers, processes, and wire decoders. Question defensive machinery between typed same-process collaborators only when the repository does not promise hostile mutation or independent ownership.

For asynchronous code, map sentinels, readiness promises, cancellation paths, disposers, queues, and state flags to distinct owners and transitions. When several mechanisms encode the same settlement or liveness fact, consider one lifecycle controller. Preserve separate mechanisms when they protect genuinely different outcomes, ownership boundaries, publication guarantees, rollback, callback containment, or shutdown behavior.

## Evaluate Dependency Swaps

Prefer an available standard-library or platform feature when it covers the required behavior. Before proposing an external dependency:

- Read the hand-rolled implementation and identify the exact behavior the dependency would replace.
- Follow the repository's dependency policy and verify maintenance, adoption, compatibility, and transitive footprint when current package facts matter.
- Account for residual semantics and glue the dependency does not cover.
- Compare implementation, dedicated tests, documentation, and maintenance burden removed against wrapper and dependency-management code added.
- Reject swaps that relocate the same complexity or broaden the public contract.

Classify a swap that changes observable behavior as a design-change candidate, not a cleanup.

## Prove Or Reject Every Candidate

Classify consumers before reporting a candidate:

- Production: runtime source, public entry points, loaders, manifests, configuration paths, generated registries, deployment code, and supported examples.
- Non-production: tests, documentation, snapshots, fixtures, generated expected output, and comments.
- Ambiguous: scripts, examples, plugins, reflection targets, wire formats, migration code, and externally consumable APIs. Resolve their role before drawing a conclusion.

Use `rg` first. Search exact symbols, event or command names, configuration keys, package names, method-call forms, serialization names, and wire strings, then read the relevant call sites. Inspect history or design records when they may explain intentional complexity.

Reject or downgrade a candidate when a production or plausible external consumer exists, a current contract requires it, recorded rationale still applies, unrelated churn outweighs the simplification, or the evidence cannot distinguish dead code from dynamic use. Separate behavior-changing ideas from behavior-preserving cleanup and state the tradeoff instead of quietly crossing that boundary.

## Report The Investigation

Report:

- The scope, comparison base when applicable, and areas surveyed.
- Strong candidates ordered by expected net value, not by candidate count.
- For each candidate: location, consumer evidence, current cost, proposed simplification, net benefit, behavior or contract impact, risk, confidence, and focused verification.
- Behavior-preserving cleanup separately from design-change candidates.
- Representative rejected or downgraded candidates when they demonstrate that important boundaries were checked.
- Checks performed and their passed, failed, skipped, or unrun status.

An investigation with no strong candidate is a valid result. Say so directly rather than promoting thin guesses.

## Implement Only When Requested

When the user authorizes implementation, apply the smallest coherent change for the selected candidates. Preserve unrelated work and avoid opportunistic refactoring. Obtain explicit agreement before implementing a candidate that changes behavior, public API, durable data, wire format, migration history, or dependency policy.

After editing, repeat the consumer searches, run the repository's relevant focused checks plus `git diff --check`, and inspect the outgoing diff for accidental scope growth. Report exactly which checks passed, failed, were skipped, or were not run. Leave commits, pushes, PR updates, and branch housekeeping to separate user authorization.

## Completion Criteria

Finish only when:

- The requested scope and every major production area within it have been accounted for.
- Every reported candidate has call-site or contract evidence and a credible counterargument assessment.
- Every observable behavior difference is explicit.
- Static-analysis leads have been verified against real consumers.
- Findings are prioritized by net simplification value.
- The working tree remains unchanged unless implementation was explicitly authorized.
