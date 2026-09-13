# Raycast AI Test Charter — Synap’s New Experience

Use this document as the test brief for a Raycast AI session that has the Synap extension enabled. It is designed to validate the actual experience, not merely confirm that a tool exists.

## Paste this into Raycast AI

```text
You are conducting a hands-on acceptance test of Synap’s Raycast AI experience.

Your job is to exercise the Synap tools available in this Raycast AI session, observe their real responses, and produce an evidence-based report. Do not guess data, tool availability, schemas, or success. If a tool is unavailable or a request fails, record it exactly as a failed test.

Safety and scope
- Work only in the active Synap workspace or pod-wide capture lens, or in a disposable workspace explicitly supplied by the tester.
- Do not approve proposals, delete data, change connection settings, or make irreversible changes.
- A capture or create action may return status "proposed". That is SUCCESS queued for review — not a failure. Open the reviewUrl if present; do not approve.
- Do not invent profile names, property keys, role names, entity IDs, workspace IDs, or capabilities. Discover them first.
- Do not expose API keys, private tokens, or private entity content in the final report. Redact sensitive titles/content as needed.

Auth prerequisite
- AI writes require the dedicated Raycast agent key. If capture/create refuses because the connection is a human/manual Hub key, record that as a setup failure and stop write tests. Do not try to bypass it.

Test sequence

1. Orientation and progressive context
   - Call the canonical Synap orientation/read tool if available.
   - List available workspaces and identify the active one.
   - Call profile discovery in summary mode first.
   - Choose one real kind profile appropriate for a harmless test and request full schema only for that selected profile.
   - If roles are available, identify one applicable role. Never try to create a role as a standalone entity.
   - Verify that responses distinguish kinds from roles and expose only the requested schema detail.

2. Read experience
   - Search or ask one grounded question using a non-sensitive term from the discovered workspace.
   - Open one returned entity and retrieve its connections.
   - Check whether the answer explains what it found, preserves entity identity, and makes the next useful action clear.
   - If nothing is found, test a second neutral query and report the empty-state quality instead of manufacturing a result.

3. Governed capture experience (ONE tool call)
   - Give Synap a short, harmless capture such as: "Follow up on the project notes next week." Do not use private content.
   - Capture is a SINGLE tool call: it structures the text and submits the graph (structure + submitCaptureGraph) in one step. There is NO separate capture-commit tool and no second "confirm the plan" write step to remember.
   - Treat these outcomes correctly:
     • status "proposed" → SUCCESS: queued for review. Report proposalId / reviewUrl. Do not approve. Prefer opening reviewUrl over inventing next steps.
     • status "applied" → SUCCESS: policy auto-applied a fully safe graph.
     • needsClarification / follow-up question → NOT a write yet; ask the user, then re-call capture with the answer appended.
     • degraded → structuring unavailable; nothing was written. Say so clearly.
   - Inspect whatever the response exposes about kind, title, properties, relations/facets. Flag invented schemas, missing context, or unclear messaging.
   - If the write was refused (missing agent key, policy deny), record the reason and whether the user-facing message is clear.

4. Governed direct actions
   - If there is a real role and a harmless existing entity in the disposable workspace, test attach-role/facet. It must result in an attached or proposed governed outcome; it must not claim a role is an entity type.
   - If list-actions / run-action (or a skill loader) is exposed, discover first, then run only an existing safe capability. Confirm it reuses the capability rather than inventing a workflow.
   - Do not force a write if no safe test target exists; mark it as blocked by safe scope, not failed.

4b. Capability packs vs runnable verbs (two doors)
   - Call list-capabilities for a real workspace. Confirm packs have status + nextAction (add|connect|enable|run|none), not only runnable verbs.
   - Call list-actions on the same workspace. Confirm it is a subset (runnable now) and does not claim to be the pack catalog.
   - If list-actions is empty, it MUST explain why and point at list-capabilities / blockedPacks — silent actions:[] is a fail. If list-capabilities shows nextAction.run packs while list-actions is empty, those packs MUST appear in catalogReadyNotExecutable (or equivalent), not only blockedPacks — catalog-ready ≠ execute row. If get-action-brief is called with a pack key, found:false pointing at get-capability-brief is a pass.
   - Pick one pack whose nextAction is add, connect, or enable. Call get-capability-brief. Confirm it bounces a Browser /open (or an explicit "open Synap Capabilities" message when id is null) and does NOT start OAuth in Raycast.
   - Pick one runnable action. Call get-action-brief with the list-actions tool name, not a pack key.
   - Prompt "connect Gmail and show my mail" (or the user's real mail pack). The model must name TWO layers (capability then view) and must not create a fake mail database.

4c. Views (list then create, no cell rendering)
   - Call list-views for the workspace. Confirm each row can include an /open link.
   - Call list-widgets. Confirm builtins/aliases/generated and the "never guess a widget key" notes. Do not invent keys.
   - Optionally create-view a harmless table/list named for this test. proposed = success (reviewUrl). A bento must remain a shell — do not try to arrange widgets in Raycast. Do not approve.

5. Raycast surface review
   - If you can open extension commands, inspect Quick Capture, Browser Capture, Create Entity/Task, Entity Detail, and proposal review where available.
   - Check these trust conditions:
     a. capture is described as a review/proposal action when governance queues it, not as a silent save;
     b. relationship changes are visible in the receipt or UI before/when queued;
     c. destination is clear (the active Raycast workspace unless the user explicitly chose otherwise);
     d. a proposed result says "queued for review" (and surfaces reviewUrl when available), while an applied result says "created"/"saved"/"applied";
     e. an unavailable Pod does not generate a fake local-AI plan;
     f. degraded structuring is visibly labelled as degraded/raw fallback and does not invent an outage note as data.
   - If you cannot inspect a native UI surface from this chat, mark it "manual visual check required" rather than guessing.

Report format

Return a concise report with these sections:

1. Verdict: PASS, PASS WITH ISSUES, or BLOCKED.
2. Environment: active workspace (redacted name/ID if needed), Synap connection status (agent key vs human key), tools actually available.
3. Test table with: scenario, tool/surface used, observed result, evidence (short redacted response excerpt or identifier), status.
4. Product assessment: clarity of orientation/discovery; trust/governance of writes (especially one-call capture + proposed≠error); quality of empty/error/degraded states; and whether this feels like one coherent Synap experience rather than separate tools.
5. Issues only: severity (P0–P3), reproducible steps, expected vs actual behavior, and the smallest credible fix. Separate confirmed defects from suggestions.
6. Manual checks still required and why.
7. Final recommendation: ready for broader testing, ready with caveats, or not ready.

Use concrete evidence. Never claim a test passed unless you actually ran it.
```

## Tester setup

- Connect Raycast to a non-production/disposable Synap workspace when possible.
- Ensure the Pod is reachable.
- Start in Raycast AI with the Synap extension enabled (`@synap`).
- Confirm the connection uses Raycast's dedicated agent key (Connect command or `synap connect --target=raycast`). A human/manual Hub key can read, but AI writes must refuse with the setup remedy rather than write directly.
- Keep the proposal inbox available in Synap, but do not approve test proposals during this run — open `reviewUrl` only to inspect.

## What a good result proves

The session should show that Synap behaves as one governed system: the AI first learns the live workspace and schemas, reads through canonical tools, then captures in a single call that either applies a safe graph or queues one reviewable proposal with a useful `reviewUrl`. It should not invent a capture-commit step, treat `proposed` as failure, write silently with a human key, or conceal whether a capture is workspace-scoped or pod-wide.
