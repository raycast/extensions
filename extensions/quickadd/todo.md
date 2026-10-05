# Beyond-him program (raycast-quickadd)

Playbook: Feature, run once per PR. Multi-phase-plan playbook skipped: the operator already gave the go and each unit is small; its ten-lane swarm per PR is out of proportion for a 2k-line extension.

## Feature playbook steps (verbatim), per PR

1. `how` over the affected subsystem. - [x] skip: both repos' relevant modules were read in full this session before the plan (run-choice, interactive-session, lib/*, plugin cli/*, interactive/*); re-running `how` would only re-read them.
2. `architect` for parallel design exploration. - [x] skip for PR1: the FieldSpec shape is fixed by the wire FormField and Raycast's form controls; no second structurally distinct candidate exists. Revisit for PR2c (vault discovery) if a real fork appears.
3. Write the throughput checkpoint as four todo items.
   - [x] Blocking first steps: PR1 (delete check-then-run, FieldSpec renderer, vitest) gates every later extension PR.
   - [x] Independent workstreams: plugin `quickadd:suggest` handler runs in the quickadd repo in parallel with PR1. Everything in the extension is serialized on the PR1 -> PR2 -> PR3 stack because they all touch interactive-session.tsx / run-choice.tsx.
   - [x] Shared mutable state: one worktree per delegate; main checkout untouched except .audit/ and todo.md (excluded from git).
   - [x] Smallest safe decomposition: one owner per PR, sequential; one parallel owner for the plugin handler.
4. Delegate code-writing to a subagent (poteto-agent, opus). - [ ] PR1 running. - [ ] plugin suggest running.
5. Verify on the matching surface. - [ ] PR1: vitest + protocol script + Raycast screenshots (I re-check the screenshots myself).
6. Rebase into small, ordered commits. Stack follow-ups. - [ ]
7. If the design is contested, `interrogate` before shipping. - [ ] decide after PR1 diff review (deletion is operator-approved; renderer is low-contest).
8. Run **Opening a PR**. - [ ]

## Units

- [x] PR1 merged: #2 df0662a.
- [x] PR2a+b merged: #3 df01996.
- [x] PR2b frecency: in PR #3 as its own commit.
- [x] PR2c merged: #4 f3d275e.
- [x] Plugin: `quickadd:suggest` merged, chhoumann/quickadd#2175 (1ae4ca31).
- [x] PR3a merged: #5 8da9777.
- [x] PR3b merged: #6.
- [x] PR3d Save Clipboard Image: dropped, the CLI handler writes a fixed 1px PNG (a verification hook), not the clipboard.
- [ ] PR3c explicit current-note context: deferred; decide after 3a/3b (plugin change across engines, UI question open).
- [x] PR4 store merged: #8. Escape-abort bug open as #7.
