# 002 — "Needs your input" with a real agent

## Problem
The blocked state is covered by unit tests with sample data, but no real program has reported it yet.

## Acceptance criteria
- **AC1** While Claude Code, running in a Rex session, waits for a permission, `rex block call … program_status`
  reports `state: blocked`.
- **AC2** Within one polling interval (15 s) the menu bar title shows `!` and the session shows
  "Needs your input" in the dropdown.
- **AC3** A notice is produced once for that prompt (no repeats while it stays blocked).
- **AC4** After the prompt is answered or refused, the session leaves the blocked state.

## Check
A throwaway session in an empty temp folder runs Claude Code (cheapest model, default permission mode)
asked to create one file, which needs a permission. Observe `program_status`, the menu bar and the dropdown.

## Result (2026-11-04)
- **AC1** pass: Claude Code reported `state: blocked`, `kind: permission`, `msg: "approve Write: …/hello.txt"`.
- **AC2** pass: the menu bar title showed `!` and the session showed the orange warning icon in the dropdown.
- **AC3** pass: one HUD, "Rex: demo-blocked needs your input (permission)", appeared about 10 s after the prompt
  and did not repeat during the next 17 s.
- **AC4** pass: after refusing the permission the session left the blocked state.

## Bug found by this check
After a refused permission Claude Code reports `idle` while it stays in the foreground waiting for the next
message. The first version fell back to the process and showed it as "working". Fixed: an explicit `idle`
report is trusted, and the process is only used when a program reports nothing. Regression test added first
(`a program that reports idle is idle even while it stays in the foreground`).
