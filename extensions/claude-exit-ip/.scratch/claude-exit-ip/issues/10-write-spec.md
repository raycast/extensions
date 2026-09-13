# 10 — Write the handoff spec

Parent: [map.md](../map.md)
Type: task
Status: resolved 2026-07-27
Blocked by: 04, 05, 06, 07, 08, 09, 11

## Question

Assemble every resolved decision into `.scratch/claude-exit-ip/spec.md` — the destination artifact, complete enough that an implementer who has read none of this map can build the extension without asking a question.

Must contain: the manifest verbatim, the file layout, the fetch-and-parse contract with its failure taxonomy, the geo contract, the rendered card for all four states, the action panel, refresh/caching behaviour, the reference-code provenance and attribution decision, and the verification steps that count as done.

No open questions may remain in it. Anything still open means a ticket was missed — chart it instead of writing a placeholder.

Closing this ticket reaches the destination; the map is done.

## Notes carried in from 11 (all deps now resolved — this is the map's last ticket)

[11](11-verification-story.md) fixed the verification story and left four things the spec must carry **verbatim**, not paraphrase:

1. **The fixture bytes.** The real trace body (all 16 Cloudflare keys, `ip=` redacted to `203.0.113.9` / `2001:db8::1`) and the real ipwho.is bodies. Embedded so the build session can write tests offline, and so the redaction convention doesn't get lost.
2. **The temporary-edit recipe**, one line per forced state, as the stage-2 procedure — including the `sleep` that holds the ~0.4s progressive render open long enough to judge.
3. **Two build requirements where the natural spelling is the wrong one**, both worth stating as requirements rather than leaving to be rediscovered:
   - `AbortSignal.any([hookSignal, AbortSignal.timeout(5000)])` on both fetches. Neither call may build a bare `AbortSignal.timeout` and drop the hook's signal, or 08's abort ordering silently doesn't hold.
   - The geo guard is `json.success === false`, **not** `!json.success` — `?fields=` drops `success` from a *successful* body while keeping it on failure, so the obvious spelling fails every healthy lookup.
4. **A two-stage acceptance section**, in "green ≠ done" terms: four gates and 11 fixture cases close stage 1 (agent, headless); the six-state sweep, four actions and two ⌘R checks close stage 2 (human, in Raycast). The agent must not claim a state was seen.

Also: 11 adds a third pure module, `src/lib/refresh.ts` (`nextState(prev, trace)`), which is where 08's compare-IPs refresh rule lives — the file layout in the spec should show it alongside `trace.ts` and `geo.ts`, plus `vitest.config.ts` and the `test` / `test:watch` / `type-check` scripts.

---

## Resolution — 2026-07-27

**Spec written to [spec.md](../spec.md), labelled `ready-for-agent`. The destination is reached.**

Eleven decisions collapsed into one buildable document: problem and solution, 39 user stories, eleven implementation decisions, the testing decisions with all eleven fixture cases and their bytes, a two-stage acceptance section, out of scope, and the assumptions it inherits.

Carried **verbatim**, as this ticket required: the manifest, the healthy and failure card markdown, all five copy slots, the three provenance footers, the action table with shortcuts and payloads, the `nextState` transitions, the fixture bytes, and the temporary-edit recipe.

Two deviations from the `/to-spec` template, both deliberate:

1. The template says no file paths and no code snippets. This spec carries both — a module layout, the manifest, and the fixture bytes. Its own invariant is that an implementer who has read none of the map can build without asking a question, and the fixture bytes in particular cannot be paraphrased: describing them would cost the build session a network round trip and lose the redaction convention. The template's snippet exception (a prototype snippet that encodes a decision more precisely than prose) covers the card markdown directly.
2. An **Acceptance** section was added between Testing Decisions and Out of Scope, because 11's two-stage rule is neither a testing decision nor an implementation one — it is a definition of done, and burying it would lose the "green ≠ done" boundary that keeps a headless agent from claiming it saw a card.

Three additions the map did not already hold, all surfaced while assembling:

- `vitest` and the `type-check` / `test` / `test:watch` scripts folded into 06's manifest, which was fixed before 11 existed.
- The two trap spellings (`json.success === false`, `AbortSignal.any`) collected into a closing section, since both are cases where the obvious code is the wrong code and both produce a card that looks fine.
- The provenance and attribution decision from 04 written into the repo-bootstrap section as a README requirement, which no ticket had assigned to a file.

Left open by design: `marcuslannister` unverified as a Raycast handle, Anthropic's trademark policy unread, `platforms` narrower than the code requires. All three are recorded in the spec as inherited assumptions rather than findings.
