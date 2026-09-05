# refactor: Simplify multi-ai-chat

**Mode:** default

## Summary

The repository is small and has a direct command-to-automation flow, so its main complexity is not excessive layering. It comes from repeated service and browser catalogs plus declarations and a dependency that current code never consumes. This plan removes the dead surface first, then makes the existing service and browser catalogs authoritative without changing prompt handling, browser automation, error behavior, timing, side effects, or ordering.

## Complexity Assessment

The runtime is three source files: `src/multi-ai-chat.tsx`, `src/lib/types.ts`, and `src/lib/browser-automation.ts`. `broadcastPrompt` is the automation module's only export and has one caller, so splitting the large automation file would increase the files needed to trace the single core operation.

Complexity instead concentrates in duplicated data and wider-than-used interfaces:

- `AI_SERVICES` and `SERVICES` repeat the same three IDs, names, and ordering. The form reads `SERVICES`, then performs one `AI_SERVICES.find(...)` lookup for each of the three entries to reconnect UI data to automation data.
- The seven non-default browser bundle IDs are repeated in the `Browser` union, `BROWSER_OPTIONS`, `getAppName`, and `BROWSER_APP_NAME_BY_BUNDLE_ID`. The seven AppleScript application names are repeated in `getAppName`, `BROWSER_APP_NAMES`, and `BROWSER_APP_NAME_BY_BUNDLE_ID`.
- `AIService.searchUrl` and `AIService.extraSetupJs` have no configured values or reads. `AIService.submitSelector` has three configured values and no reads. `CHROMIUM_BUNDLE_IDS` and `getBrowserName` have no source consumers.
- `@raycast/utils` is present in `package.json` and `package-lock.json` but has no runtime import under `src/`.

There are no test files or test script. The current working tree also contains uncommitted adaptive-loading and clipboard changes in `src/lib/browser-automation.ts`, with matching preference-copy changes in `package.json` and generated `raycast-env.d.ts`. This assessment includes that working-tree state, but the simplification units deliberately avoid the timing and clipboard behavior being changed. No candidate depended on age, origin, co-change, churn, or unexplained historical rationale, so the conditional history gate was not used.

## Simplification Units

### S1. Remove the unused Raycast utilities dependency

- **Strength:** Strong
- **Goal:** Make the install surface match the dependencies the extension actually imports.
- **Evidence:** `@raycast/utils` appears as a direct dependency in `package.json` and as root/package entries in `package-lock.json`, but there are zero imports from it under `src/`. This passes the deletion, current-impact, blast-radius, and explanation tests.
- **Approach:** Remove the direct dependency and refresh only the lockfile metadata that belongs to it. Keep mentions in `raycast-development.md`; they are examples in a general Raycast reference, not runtime consumers.
- **Files:** `package.json`, `package-lock.json`
- **Blast radius:** Dependency installation and lockfile resolution only; no source call site changes.
- **Risk & mitigation:** Raycast tooling could have an undocumented expectation that the package is installed directly. Mitigate by using the existing typecheck and lint commands after the lockfile is refreshed; do not change `@raycast/api`.
- **Verification:** `! rg -n '"@raycast/utils"|from "@raycast/utils"' package.json package-lock.json src`; `./node_modules/.bin/tsc --noEmit`; `npm run lint`.
- **Expected effect:** One direct dependency and its dedicated lockfile subtree are removed; the manifest has no dependency with zero source consumers.

### S2. Delete unused service fields and browser exports

- **Strength:** Strong
- **Goal:** Narrow the source model to behavior the extension currently implements.
- **Evidence:** `searchUrl` and `extraSetupJs` each have only their interface declaration; `submitSelector` has one declaration and three configured values but zero reads. `CHROMIUM_BUNDLE_IDS` appears only at its declaration, and `getBrowserName` has no source consumer. The extension is an application rather than a published library, and its `prepublishOnly` guard blocks accidental npm publishing. This passes the deletion, usage, speculation, blast-radius, and explanation tests.
- **Approach:** Remove the three unused `AIService` properties and their configured values, then delete the two unconsumed browser exports. Retain `inputSelector`, host validation, retries, clipboard fallback, and every error path. Update `CLAUDE.md` so it describes the remaining service model and helpers rather than the deleted surface.
- **Files:** `src/lib/types.ts`, `CLAUDE.md`
- **Blast radius:** The internal service type, three service records, and repository guidance. No live call site consumes the deleted names.
- **Risk & mitigation:** The fields may represent a future auto-submit design, but the current implementation and `CLAUDE.md` explicitly preserve manual review and submission. A repository-wide reference check plus the compiler protects against a missed consumer; future functionality should add fields when it has a live use.
- **Verification:** `! rg -n '\b(searchUrl|submitSelector|extraSetupJs|CHROMIUM_BUNDLE_IDS|getBrowserName)\b' src CLAUDE.md`; `./node_modules/.bin/tsc --noEmit`; `npm run lint`.
- **Expected effect:** `AIService` shrinks from seven properties to the four currently consumed properties, and two zero-consumer exports disappear.

### S3. Make `AI_SERVICES` drive the form

- **Strength:** Worth exploring
- **Goal:** Remove the second AI-service catalog and the reconciliation lookup between UI and automation.
- **Evidence:** `AI_SERVICES` and `SERVICES` contain the same three IDs in the same order, and each UI title equals the matching service name. Rendering maps `SERVICES`; submission maps it again and performs three `AI_SERVICES.find(...)` lookups. This passes the deletion, indirection-tax, blast-radius, and explanation tests.
- **Approach:** Render service dropdowns and build `serviceCounts` directly from `AI_SERVICES`, using `name` for the current label. Delete `SERVICES` and its non-null lookup. Keep the explicit `FormValues` fields unless a simpler type is already available; deriving a mapped type from the runtime catalog would add type machinery for little payoff.
- **Files:** `src/multi-ai-chat.tsx`
- **Blast radius:** Form dropdown labels/order/defaults and construction of the sole `broadcastPrompt` call.
- **Risk & mitigation:** A changed ID, label, ordering, default count, or `"0"` filtering rule would alter user-visible behavior. Because the repository has no test harness, select the smallest viable characterization setup first and capture those cases before editing; if that prerequisite is disproportionate, do not land this unit on inspection alone.
- **Verification:** Run the added characterization cases for the three IDs, labels, ordering, default `"1"` values, and `"0"` filtering; `! rg -n '\bSERVICES\b|AI_SERVICES\.find' src/multi-ai-chat.tsx`; `./node_modules/.bin/tsc --noEmit`; `npm run lint`.
- **Expected effect:** Two service catalogs become one, three lookup operations disappear, and a reader no longer has to reconcile service identity across two arrays.

### S4. Consolidate runtime browser identity

- **Strength:** Worth exploring
- **Goal:** Carry one runtime browser identity and derive its UI label, AppleScript name, recognition membership, and Safari branching from one authoritative catalog.
- **Evidence:** The seven concrete bundle IDs occur in four TypeScript structures; the seven AppleScript names occur in three. `getAppName` serves one explicit-browser call site, `BROWSER_APP_NAME_BY_BUNDLE_ID` serves one default-browser call site, and `BROWSER_APP_NAMES` serves two recognition checks. In addition, `isSafari` is derived once from `browserAppName` and threaded through seven internal function signatures even though every recipient also receives the app name. This passes the rule-of-three, deletion, indirection-tax, current-impact, blast-radius, and explanation tests.
- **Approach:** Keep one runtime browser catalog containing bundle ID, UI title, and AppleScript application name. Derive lookup and recognition behavior from it while preserving the intentional `"Brave"` versus `"Brave Browser"` distinction, case-insensitive default-handler lookup, the empty result for an unknown detected bundle ID, and the existing explicit-browser fallback. Carry the application name as the sole browser identity and derive Safari branching at the use site. Keep the browser preference list in `package.json` as a separate Raycast schema boundary, and never edit generated `raycast-env.d.ts` by hand.
- **Files:** `src/lib/types.ts`, `src/lib/browser-automation.ts`
- **Blast radius:** Browser preference rendering, explicit and system-default browser resolution, frontmost-browser recognition, Safari/Chromium script selection, tab counting, tab switching, and injection routing.
- **Risk & mitigation:** A lost fallback or name mismatch could route automation to the wrong application. Before consolidation, add characterization coverage for all seven bundle-ID mappings, case-insensitive lookup, unknown-ID behavior, recognized frontmost names, the Brave label/name distinction, and Safari versus non-Safari branching. Rebase this unit only after the current adaptive-loading work in `src/lib/browser-automation.ts` is stable; do not mix the changes.
- **Verification:** Run the new browser-mapping and branch characterization cases; `! rg -n 'BROWSER_APP_NAME_BY_BUNDLE_ID|BROWSER_APP_NAMES|isSafari: boolean' src/lib/browser-automation.ts`; `./node_modules/.bin/tsc --noEmit`; `npm run lint`.
- **Expected effect:** Three overlapping runtime browser collections become one catalog, bundle-to-app lookup has one source of truth, and seven internal signatures stop carrying a redundant boolean.

## Sequencing

- **Wave 1 — pure deletions:** S1, then S2. They are independent and establish the smallest source and dependency surface before any consolidation.
- **Wave 2 — contained consolidations:** S3, then S4. S3 is the smaller change. S4 should start only after the current uncommitted automation work is stable and the required browser characterization coverage exists.
- After implementing each unit, run its verification, stage only that unit with `git add`, and stop. Do not commit; commits are the user's call.

## Rejected Findings

- **Merge the precise and generic JavaScript-injection pipelines:** Rejected in default mode under the rule of three and no-new-machinery guardrail. There are two selector strategies, not three, and their input-discovery behavior differs materially. Sharing their executor/retry flow would require a strategy callback, mode flag, or wider helper; the current adaptive retry work also makes timing and fallback order behavior-sensitive. Reconsider only with a third genuine strategy or focused coverage that proves a deletion-only shape.
- **Introduce structured automation outcome codes:** Rejected under the default-mode no-new-machinery and explanation tests. Separating retry/fallback control codes from display messages may improve robustness, but it adds a result taxonomy rather than removing a concept; treat it as reliability work if pursued.
- **Split `src/lib/browser-automation.ts` because it is large:** Rejected under the indirection-tax and explanation tests. The module exposes one operation to one caller, and the current flow already crosses only the command, shared types, and automation modules. File length alone does not justify adding more boundaries.
- **Remove the per-run browser dropdown because a preference exists:** Rejected by behavior invariance. The form value intentionally overrides the stored preference for one invocation.

## Deferred / Out of Scope

- `package.json` says the extension opens tabs, pastes the prompt, and “submits it,” while `CLAUDE.md` and the implementation say submission is manual. Correcting that user-facing description is documentation/product-contract work, not code simplification.
- The uncommitted adaptive page-loading, single-tab, and lazy-clipboard changes in `src/lib/browser-automation.ts` are behavior and performance work. Finish and verify them separately rather than folding them into S4.

## Open Questions

- Which minimal characterization-test setup should protect S3 and S4? The repository currently has no test files, runner, or `test` script. Those units should not land until this is decided.
- Are the current uncommitted automation and preference-copy edits the intended baseline? Revalidate S4's mapping and parameter counts after that work is finalized.
