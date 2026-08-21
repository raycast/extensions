# refactor: Simplify the request flow and module surface

**Mode:** default

## Summary

The codebase is already compact and keeps URL construction and request execution in a coherent, testable core. The remaining avoidable complexity is a one-call-site Raycast adapter between the command and that core, plus three named type exports that no other module consumes. This plan removes those surfaces while preserving service order, sequential opening, browser selection, error aggregation, toast behavior, and the product contract recorded in `CLAUDE.md`.

## Complexity Assessment

One submit operation currently crosses three runtime files: `src/multi-ai-chat.tsx` calls the sole exported function in `src/lib/open-prompt-urls.ts`, whose two-statement body calls `buildPromptUrlRequests` and `openPromptUrlRequests` in `src/lib/prompt-urls.ts`. The adapter has one inbound import and one call site, adds no validation or error handling, and binds an `open` function from a framework that the command already imports. The injected opener seam in `openPromptUrlRequests` is the valuable test boundary and can remain unchanged after the adapter is removed.

The core module declares six exported types or interfaces. Repository-wide usage shows that `AIService`, `PromptUrlRequest`, and `PromptUrlOpener` are referenced only inside `src/lib/prompt-urls.ts`; `AIServiceId`, `ServiceCounts`, and, until the adapter is removed, `OpenPromptUrlsResult` have external consumers. `package.json` defines an application extension rather than a reusable package surface and actively blocks ordinary npm publication, so there is no declared external library consumer to preserve.

No architecture decision log was found, and neither recommendation requires historical evidence. The documented architecture and product constraints in `CLAUDE.md` remain authoritative: the core stays independent of Raycast, URLs retain the `q` parameter semantics, tabs open sequentially, later tabs continue after a failure, the browser bundle ID remains optional, and success copy does not claim response verification.

## Simplification Units

### S1. Make implementation-only types private

- **Strength:** Strong
- **Goal:** Reduce the URL module's named import surface to types that another module actually consumes.
- **Evidence:** `src/lib/prompt-urls.ts:24-44` exports six type/interface declarations. A repository-wide symbol search finds no imports of `AIService`, `PromptUrlRequest`, or `PromptUrlOpener`; each is referenced only by declarations and function signatures in the same file. This passes the deletion test, current-impact test, blast-radius test, and explanation test: three `export` modifiers disappear without replacement or runtime effect, and readers see a more accurate module boundary.
- **Approach:** Remove the exported status of `AIService`, `PromptUrlRequest`, and `PromptUrlOpener`. Keep their definitions and every function signature, data shape, and inference path unchanged. Do not rename or combine the types.
- **Files:** `src/lib/prompt-urls.ts`
- **Blast radius:** One compile-time-only module edit. No runtime code, imports, test behavior, or manifest surface changes.
- **Risk & mitigation:** An undeclared consumer outside the repository could import one of these names, but `package.json` exposes no library entry point or package exports. Before changing the modifiers, repeat the full in-repository import search; retain an export if a real consumer has appeared. Type-check afterward to catch any indirect declaration issue.
- **Verification:** Run `rg -n "\\b(AIService|PromptUrlRequest|PromptUrlOpener)\\b" src tests` and confirm the three names remain confined to `src/lib/prompt-urls.ts`; run `./node_modules/.bin/tsc --noEmit`, `npm test`, and `npm run lint`.
- **Expected effect:** Six exported type/interface names become three, with no new concept, file, or runtime behavior.

### S2. Inline the one-use Raycast adapter

- **Strength:** Strong
- **Goal:** Remove a pass-through module and let the command compose the existing request builder and executor directly.
- **Evidence:** `src/lib/open-prompt-urls.ts:9-16` exports one function with one caller at `src/multi-ai-chat.tsx:74-78`. Its body only builds requests and passes them, the browser bundle ID, and Raycast's `open` to the tested executor. The command already depends on `@raycast/api`, while `src/lib/prompt-urls.ts` retains the injected `PromptUrlOpener` boundary and has combined-path coverage at `tests/prompt-urls.test.mts:99-159`. This passes the deletion test, usage test, indirection-tax test, blast-radius test, and explanation test: a representative submit flow loses one function concept and one file hop without moving Raycast into the pure core.
- **Approach:** Bind Raycast's `open` in `src/multi-ai-chat.tsx` and invoke `buildPromptUrlRequests` followed by `openPromptUrlRequests` at the existing `openPromptUrls` call site. Preserve the current argument order, awaits, sequential executor, surrounding `try`/`catch`/`finally`, and all toast timing and copy. Delete `src/lib/open-prompt-urls.ts`. Once its only external type import is gone, make `OpenPromptUrlsResult` private in the core module. Update the architecture description in `CLAUDE.md` so it describes the command as the Raycast binding point and the core as the testable request builder/executor.
- **Files:** `src/multi-ai-chat.tsx`, `src/lib/open-prompt-urls.ts`, `src/lib/prompt-urls.ts`, `CLAUDE.md`
- **Blast radius:** One runtime caller, one deleted adapter, one newly private compile-time type, and one documentation update. Provider catalog, URL encoding, request ordering, executor error handling, form controls, and preferences remain untouched.
- **Risk & mitigation:** Composition could regress by omitting the browser bundle ID, passing the wrong opener, changing the two-call order, or moving logic outside the existing error boundary. Treat the existing combined builder/executor tests as characterization coverage and leave them unchanged; compare the new call directly with the adapter's former two statements before deletion. If the change requires altering either core function or its tests, stop and reassess because the unit has exceeded its intended boundary.
- **Verification:** Run `rg -n "open-prompt-urls|openPromptUrls" src tests CLAUDE.md` and confirm there are no remaining references; run `./node_modules/.bin/tsc --noEmit`, `npm test`, and `npm run lint`. Inspect the final diff to confirm the submit handler still awaits request construction/execution inside the same `try` block and still passes `preferences.browser` and Raycast's `open`.
- **Expected effect:** The submit path goes from three runtime files to two, and the one-use `openPromptUrls` interface and adapter file disappear while the pure opener seam remains.

## Sequencing

Wave 1 is S1, the compile-time-only surface deletion. Verify it independently, stage `src/lib/prompt-urls.ts`, and stop.

Wave 2 is S2, the adapter inlining and deletion. It is independently landable whether or not S1 was applied; verify the request-flow invariants, stage only its four listed paths, and stop.

After implementing each unit, stage the changes with `git add` and stop there. Do not commit; commits are the user's call.

## Rejected Findings

- **Merge all URL logic into `src/multi-ai-chat.tsx`:** Rejected by the explanation and blast-radius tests. The pure core has multiple cohesive responsibilities covered by focused tests; folding it into the Raycast UI would remove a file at the cost of mixing URL policy, sequencing, and framework behavior.
- **Split `src/lib/prompt-urls.ts` into catalog, URL-builder, and executor modules:** Rejected by the indirection-tax and explanation tests. The 102-line module has one coherent request-delivery responsibility and no dependency cycle; splitting it would add files and navigation without narrowing the caller-facing concepts.
- **Derive the expected service catalog in its test from `AI_SERVICES`:** Rejected because it would weaken behavior verification rather than simplify arrangement. The explicit expected order, names, and endpoints in `tests/prompt-urls.test.mts:10-32` independently protect the product contract.
- **Introduce helpers for tab options, toast messages, or test setup:** Rejected by the rule of three and explanation tests. The current occurrences do not form three genuine repetitions with one responsibility, and new helpers would add names without reducing the flow a reader must understand.
