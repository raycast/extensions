Model and command management checks

Upstream merge scope:

| Changed behavior | Decision | Conditions / stop boundary | Layer |
| ---------------- | -------- | -------------------------- | ----- |
| Shared remote/manual model picker | update-existing | Select a remote ID for an independent command; select a typed ID after discovery fails and observe it in the saved command and API request; create an ordinary preset through the same picker | Raycast runtime integration |
| Inherited model selection | update-existing | Preserve inherited/custom help text, keep the base ID when absent from remote options, customize through the searchable picker, then reset to the latest base ID | Raycast runtime integration |
| Model discovery response and option handling | existing-test-enough | Keep the upstream parser and option tests for malformed responses, custom IDs, deduplication and saved IDs | Unit |
| Catalog, navigation and migration | existing-test-enough | Existing management tests continue to verify persistence, dependency protection, draft retention and selection; merging must not restore the old separate model store | Store + runtime integration |
| Changelog, dependency lockfile and test script merge | no-test | Preserve both release entries, retain upstream dependencies, and use one test script that discovers both suites; validate with install, build and lint | Build checks |

Merge validation: **PASS**. All 41 tests pass with no skips; the extension build, typecheck and lint pass. Four automated mutations in temporary copies were detected by the affected runtime tests: removing inherited help text, ignoring model search input, dropping the selection callback, and discarding remote options. The tests continue to use a local HTTP provider and isolated storage.

Independent command configuration scope:

The direct-edit UI updates the existing inherited-command runtime tests: fields show live effective values without override checkboxes or a duplicate summary; edits customize only that field; reset-one preserves other overrides and reset-all restores the base. Same-value native callbacks must preserve inheritance. After a base reasoning-effort change, customizing its enabled state must retain the latest effort, including while the effort field is hidden. These are observed through real form events, saved flags, visible values and actual requests; the old checkbox interactions are retired, not the underlying inheritance contract.

Mode changes clear obsolete model/temperature errors while preserving unrelated name validation. The independent-create runtime test reproduced stale errors on valid inherited values before the fix, then passed after the mode-change handler cleared those setting errors.

| Changed behavior               | Decision             | Conditions / stop boundary                                                                                                                                                                     | Layer                       |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Independent configuration      | test                 | Save without a base, preserve every parameter on reload, no extra preset, unaffected by base edits; creation time stays stable and edits advance update time                                   | Store integration           |
| Per-setting overrides          | test                 | Each overridden value wins (including zero/false/empty); other values track base edits; clearing overrides resumes inheritance; base remains unchanged                                         | Store integration           |
| Dependency mode changes        | test                 | Detach releases the base for deletion/import; explicit inheritance requires a valid base; legacy behavior stays covered                                                                        | Store integration           |
| Direct creation                | test                 | AI Commands starts independent, custom fields validate, save and run use the chosen parameters, Continue in Chat uses the same configuration                                                   | Raycast runtime integration |
| Inherited form and mode switch | update-existing      | Creation from Models starts inherited with editable effective values; direct edits replace checkbox activation; reset one/all in actions replaces unchecking; base edits and detach still work | Raycast runtime integration |
| Model choice                   | test                 | Command's shared selector loads remote options and saves selected ID; manual input covered by direct creation                                                                                  | Raycast runtime integration |
| Temperature validation         | test                 | Empty/nonfinite/out-of-range rejected; zero and two accepted                                                                                                                                   | Unit                        |
| Existing Model form selector   | existing-test-enough | Existing Models-to-Ask test edits the model ID and observes it in the next request; catches a missing selector change callback                                                                 | Raycast runtime integration |

| Changed behavior            | Decision | Conditions / stop boundary                                                                                              | Layer                       |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Legacy migration            | test     | Array storage, stale derived entries, original parameters, original keys, restart                                       | Store integration           |
| Parameter inheritance       | test     | Base edits update model ID, temperature, reasoning, vision and inherited prompt                                         | Store integration           |
| Prompt override             | test     | Override, empty override, return to inheritance                                                                         | Store integration           |
| Command edits               | test     | Change base, retain input rules, propagate immediately                                                                  | Store integration           |
| Dependency protection       | test     | Delete/clear rejected while referenced, allowed after reassignment; import retains missing referenced bases             | Store integration           |
| Persistence                 | test     | Write failure leaves state intact; retry, concurrent saves, reload, corrupt input                                       | Store integration           |
| Model selection             | test     | Explicit/saved selection beats cache; missing preset fallback                                                           | Unit                        |
| Automatic selected text     | test     | Full input waits for text loading before opening                                                                        | Raycast runtime integration |
| Conversation continuity     | test     | Three rounds keep messages in time order after an edit                                                                  | Raycast runtime integration |
| Native navigation and forms | test     | Create from selected model, edit Command, Ask selection, edit/save/back, full input keeps draft and sends updated model | Raycast runtime integration |

The native checks run the installed Raycast JavaScript renderer in an isolated worker, with a temporary support directory and an in-memory native storage bridge. They do not operate the running Raycast app or access its preferences. API components, navigation and forms use the real runtime. No UI modules are mocked.

Additional conditions verified:

| Behavior                | Decision | Observable evidence                                                                                    | Layer                       |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------ | --------------------------- |
| Restore last model      | test     | Separate command workers share only isolated native cache; a fresh Ask selects Writer                  | Runtime integration         |
| Create ordinary model   | test     | Save Research, return to Models, and verify its new ID is selected                                     | Runtime integration         |
| Reset built-in command  | test     | Shared edited base stays unchanged; reset restores independent defaults without creating extra presets | Store integration           |
| Successful import       | test     | Read a fixture JSON file, confirm import, return with the new prompt, and reload persisted settings    | Runtime + store integration |
| Ordinary model export   | no-test  | Existing file writer receives the base-model collection directly; no new serialization logic           | Existing utility            |
| Prompt-template loading | no-test  | Fetch is deferred until the existing template picker is opened; no parser or picker behavior changed   | Typecheck/build             |

The standalone Create AI Command entry is retired (`no-test`): its manifest registration and pass-through entry file are removed, checked by the extension build and manifest inspection. Creation from Models is `existing-test-enough`: the Models-to-Command runtime test observes the selected base, saved command and return selection, and fails if that action or save callback is removed.

The command title is renamed from Search AI Command to AI Commands (`no-test`): this is display copy only; the `search-ai-command` identifier and quicklink targets are unchanged. Verified by manifest inspection and extension build.

Review follow-up scope:

| Changed behavior               | Decision        | Conditions / stop boundary                                                                                                                        | Layer               |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Default command initialization | test            | Fresh install has only the Default chat preset; reset and Delete All restore independent built-ins without accumulating presets                   | Store integration   |
| Legacy import compatibility    | test            | Older array backups retain missing referenced bases, remove unreferenced models, ignore command projections, and update explicitly imported bases | Store integration   |
| AI Commands write failures     | test            | Remove, Reset and Delete All report a failed write without changing saved data or crashing; a later successful removal works                      | Runtime integration |
| Import confirmation            | update-existing | Cancel settles without writing or closing the form; write failure keeps the form; retry saves, closes and survives reload                         | Runtime integration |
| Conversation import callers    | test            | Both empty and populated list entries preserve data on cancel; confirmed import updates the list and storage                                      | Runtime integration |
| Existing Quicklinks            | test            | Serialized launch context selects a legacy command; the request preserves its settings and Continue selects its command model                     | Runtime integration |
| Ask draft lifecycle            | update-existing | Returning from full input before submission preserves selected text; submitting clears Ask's controlled input; later rounds also clear it         | Runtime integration |

Local validation: 41 tests pass with no skips on the installed Raycast desktop runtime, including the upstream model-picker tests. Typecheck, extension build and lint pass.

Three semantic mutations were run in temporary copies of the repository and all failed their targeted tests: removing independent mode from built-ins, dropping retention of missing referenced bases during import, and removing Ask's controlled draft clear. The working tree was not modified by these checks.

The previous reset-test assertion about reusing an automatically created default preset was updated: new built-in commands must be independent, while migrated commands still retain their existing bases. Reference protection remains covered by delete/clear tests; import now preserves missing referenced bases instead of rejecting the backup.

Independent configuration review: **PASS** after fixing missing command dates. The reviewer ran all 26 tests and checked mutations that reintroduce a base dependency, invert override conditions, lose false/zero/empty values or hidden form fields, skip detaching effective settings, accept invalid form fields, drop the selected remote model from requests, or reset creation time. Store/unit tests score 12/12 and runtime integration tests 11/12; no C2/C3 findings or YAGNI veto. The native harness acknowledges focus and window-shake requests without operating the real Raycast window; assertions observe validation errors and rejected saves.

An independent review found and verified fixes for reversed multi-turn request history and the selected-text/full-input initialization race. Both regression tests were observed failing before the fix and passing afterward. Semantic mutation review also checked prompt-condition inversion, missing subscription notifications, early state publication, lost queued writes, deleted cache writes, missing creation callbacks and importing into the obsolete storage key. No self-confirming assertions or redundant-test vetoes were found. Store/unit tests score approximately 12/12 and runtime integration tests 11/12 under the test-quality rubric; runtime availability is the latter's environment boundary.

Run `npm test`. On machines without the Raycast desktop runtime, the native integration cases report an explicit skip; set `RAYCAST_API_ROOT` to its `api` directory to enable them. Native macOS window rendering and keyboard hit testing are outside this JavaScript runtime harness.

Retired test: `Models exposes a visible Create AI Command row and uses the previously selected base` was removed because the user canceled the standalone list row. Command creation through the selected model's action menu remains covered by the existing Models-to-Command runtime test.

Retired test: `the legacy Create AI Command entry opens the same inherited form with loaded presets` was removed with the standalone command at the user's request. That entry's compatibility contract is retired (`no-test`); the shared creation form remains covered by the Models-to-Command runtime test.
