# Examples and Overcorrection Traps

These examples adapt the upstream skill to Easydict. They illustrate decisions, not findings about the current tree. Verify any factual rewrite against the implementation being reviewed. Quoted suspect wording in this skill is intentional calibration material.

## Dead references with useful facts

**Before:** “Clearing the cache advances its generation (decision 7: requests started before the clear must not write results back).”

**After:** “Clearing the cache advances its generation so requests started before the clear cannot repopulate it.”

Both the mechanism and its purpose survive. `(decision 7)` is not a durable reference. In Easydict, check the generation guard in [`src/core/query/cache.ts`](../../../../src/core/query/cache.ts) and the caller in [`src/features/search/useQueryEngine.ts`](../../../../src/features/search/useQueryEngine.ts) before using this wording.

**Before:** “Follow the provider icon decision in design §3.2.”

**After:** Link [`docs/development/provider-icons.md`](../../../../docs/development/provider-icons.md) if it owns the relevant rule, and state the rule where needed.

A similar document title is not enough: verify that the linked document actually supports the claim. Standards sections and sections in maintained documents remain valid references.

## PR and review narration

**Before:** “This PR adds generation checks after the reviewer found stale requests overwriting newer results.”

**After:** “Generation checks prevent stale requests from overwriting newer results.”

The concurrency reason survives without the review transcript. Keep an existing regression test or issue reference when it helps explain the failure.

**Before:** “The cast is safe because the reviewer confirmed that every entry has passed validation.”

**After, if supported:** “Entries pass validation before reaching this boundary.”

Do not use prose to bless a cast that the implementation cannot justify. Report that discrepancy separately. If the invariant is already obvious from the adjacent guard, the redundant comment can be removed.

## Change narration versus compatibility guidance

**Before, in a current-state comment:** “The old request used to finish after the next query and clear its loading state.”

**After, if the code owns that guard:** “Only the current query may update loading state; a superseded request can finish after its replacement starts.”

**Keep:** “Legacy settings remain import sources and no longer run separate providers.”

The second sentence explains what users can still do with existing settings. Removing “legacy” or “no longer” would lose an active compatibility distinction. Check the complete migration contract, including whether deletion permits automatic re-import or requires an explicit action.

**Keep:** versioned changelog entries describing added, removed, or fixed behavior, and `{PR_MERGE_DATE}` placeholders.

Change narration belongs in release history. A prose cleanup must not convert release notes into a current-state README or alter release versions.

## Control-flow narration versus ordering rationale

**Remove:** “First read the preference, then return the value,” directly above those two obvious operations.

**Keep:** “Advance the cache generation before clearing entries so in-flight requests cannot restore cleared results.”

The second sentence explains a race condition that a future reorder could break. Preserve test comments that explain such a failure or unusual setup; remove only walkthroughs that add nothing beyond the test body.

## Bounds, uncertainty, and follow-ups

**Before:** “This size limit should be enough for now.”

**After, if supported:** “Entries larger than `MAX_ENTRY_BYTES` are not cached.”

This states the implemented boundary. It does not claim the limit covers all responses, invent a measurement, or imply that translation fails when caching is skipped.

If the original sentence records an unresolved limitation, retain that uncertainty or a concrete TODO. Do not invent an issue number, owner, or planned feature merely to replace “for now.”

**Keep:** a measured bound together with its measurement source, conditions, and observed status.

Dropping “measured” or “observed” can turn evidence into a guarantee. Do not remove those qualifiers while keeping the number.

## Languages and prompts

**Before, in an English comment:** “Clear the cache generation，这样旧请求不会写回.”

**After, if it describes the implementation:** “Advance the cache generation so requests started before the clear cannot write results back.”

**Keep:** Chinese examples in English documentation, English API names in Chinese documentation, dictionary translations, and mixed-language prompt examples.

[`src/providers/translation/ai/prompt.ts`](../../../../src/providers/translation/ai/prompt.ts) deliberately includes a mixed-language example as part of model input. Rewording it changes behavior even if the source is a TypeScript string. Do not classify it as an authoring-language slip.

When the same maintained rule appears in both READMEs, update both relevant passages while respecting their language. There is no repository-wide requirement that translated code comments be byte-identical.

## Generated prose and owned sources

**Suspect:** A provider description in a generated README table contains review narration.

**Wrong:** Hand-edit the table between `<!-- automd -->` markers.

**Right:** Inspect [`automd.config.ts`](../../../../automd.config.ts) to identify the generator or data source. If the owner is within the requested prose scope, edit it and regenerate with `npm run docs:gen`, reviewing both READMEs. If the wording comes from a behavioral configuration value, report that boundary instead of changing it as incidental cleanup.

Similarly, `raycast-env.d.ts` is generated; it is not the owner of Preferences or Arguments configuration.

## Overcorrection traps

### Turning an obligation into an endorsement

**Original:** “These compatibility paths must remain until saved profiles have migrated.”

**Wrong:** “These compatibility paths are permanent exceptions.”

**Right:** Preserve the migration condition and obligation. Verify them before making a narrower rewrite.

### Promoting a hypothetical to a feature

**Original:** “A future provider could reuse this parser if it returns the same response format.”

**Wrong:** “Other providers reuse this parser.”

**Right:** Keep the hypothetical and its condition if useful to the requested design discussion. Otherwise omit the speculative passage; do not claim another consumer exists.

### Losing a fact inside narration

**Original:** “We separated favorites in the second review round; clearing query cache leaves favorites intact.”

**Wrong:** Delete the whole sentence.

**Right:** “Clearing query cache leaves favorites intact.”

### Confusing runtime states with repository history

**Keep:** “The old request may settle after the new query starts.”

“Old” and “new” identify concurrent runtime objects. Likewise, `/v1/chat/completions`, a persisted schema version, and supported platform versions are identifiers or compatibility facts, not draft stamps.

### Deleting evidence or required explanations

**Keep:** relevant issue links, regression rationale, copyright notices, `eslint-disable` explanations, and comments explaining intentionally ignored errors.

If a suppression reason is false, fix it from the code or flag the mismatch. Removing the explanation leaves the operation less understandable. In a genuine decision record, retain useful alternatives and historical evidence without inventing an archival workflow.
