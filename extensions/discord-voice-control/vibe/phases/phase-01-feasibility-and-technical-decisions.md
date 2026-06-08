# Phase 1: Feasibility And Technical Decisions

## Goal
Prove whether the MVP can reliably toggle and confirm Discord mute/deafen from outside the Discord window, then choose the allowed implementation mechanisms.

This phase must happen before Raycast extension implementation because the business requirement depends on trustable state change, not just command execution.

## Key Questions
- Can the extension trigger mute/deafen while another app is focused?
- Can the implementation detect when Discord is not running or not in a valid voice context?
- Can the implementation confirm the resulting mute/deafen state?
- Which macOS permissions are required for each mechanism?
- Is Discord RPC viable without violating local-only, distribution, or trust requirements?
- What outcomes must be reported as `unknown` instead of `success`?

## Mechanisms To Evaluate

### Shortcut Dispatch
Use macOS automation to send the configured Discord mute/deafen shortcuts.

Evaluate:
- Whether shortcut dispatch works while Discord is not focused.
- Whether Discord must be activated temporarily.
- Whether the operation visibly disrupts the user's current app focus.
- Whether the state can be confirmed after dispatch.

### UI Automation Fallback
Use macOS Accessibility or AppleScript/System Events to inspect or interact with Discord UI controls.

Evaluate:
- Whether mute/deafen controls expose stable Accessibility metadata.
- Whether state can be read from UI attributes.
- Whether clicking controls works without fragile coordinates.
- Whether fallback requires focusing Discord.
- Whether the permission prompts and setup burden are acceptable.

### Discord Local RPC Spike
Test Discord RPC only as a spike unless requirements change.

Evaluate:
- Whether IPC connection is available on macOS Discord stable.
- Whether `GET_VOICE_SETTINGS` can read mute/deafen state.
- Whether `SET_VOICE_SETTINGS` can update mute/deafen state.
- Whether required OAuth scopes or Discord approval make the path unsuitable for a public/local MVP.
- Whether RPC voice-setting lock behavior conflicts with the product's minimal-accountability trust posture.

Do not ship any implementation that requires user tokens, selfbot behavior, undocumented client internals, or broad Discord account permissions.

## Work Items
- Build a short feasibility matrix with these columns: mechanism, setup required, control reliability, confirmation reliability, user disruption, permissions, distribution risk, MVP recommendation.
- Run a manual proof for mute and deafen from a non-Discord focused app.
- Test the no-Discord and no-voice-context cases.
- Record which bundle IDs or app names need to be detected, such as Discord stable, PTB, or Canary.
- Identify exact macOS permissions needed for shortcut dispatch and UI automation.
- Decide whether the MVP will support only Discord stable or also PTB/Canary.
- Decide whether shortcuts are fixed defaults, user preferences, or detected assumptions.
- Write a technical decision record for the selected primary path, fallback path, and confirmation source.

## Acceptance Criteria
- A mechanism decision exists before extension scaffolding starts.
- At least one control path demonstrates mute and deafen from outside Discord.
- Confirmation evidence is classified as direct, indirect, or unavailable.
- Any action that cannot be confirmed has a defined `unknown` or `failed` result policy.
- Required macOS permissions are documented in user terms.
- Discord RPC is either explicitly rejected for MVP or accepted with a clear explanation of auth, scope, approval, and local-only implications.
- The MVP has a clear go/no-go decision.

## Deliverables
- A mechanism decision record in project documentation.
- A feasibility matrix.
- Notes from real macOS + Discord manual tests.
- Updated risk list if confirmation is weaker than the product rules require.

## Phase Gate
Proceed to Phase 2 only if the MVP still has a plausible route to meet the product trust rule: success can be claimed only when the actual Discord voice state changed as intended.
