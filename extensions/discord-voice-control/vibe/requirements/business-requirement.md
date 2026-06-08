# Business Requirements Document

## Project
Raycast Discord Extension

## Document Purpose
This document defines the business requirements for an MVP Raycast extension that helps Discord users control core voice states without switching away from their current work context. It focuses on product intent, business rules, user stories, and acceptance criteria only.

## Product Summary
The product is a small utility for Raycast users who are actively in Discord voice sessions and frequently move between applications while working. Its core promise is to let users control Discord voice status without interrupting their current workflow.

## Business Goal
Deliver a focused utility that allows users to reliably toggle mute and toggle deafen from outside the Discord window, reducing workflow interruption and improving confidence during voice-based work sessions.

## Target Users
Primary users are people who participate in Discord voice channels while simultaneously working in other applications and need fast access to voice controls without changing focus.

## MVP Scope
### In Scope
- Toggle mute
- Toggle deafen
- Clear indication of whether an action is currently available or unavailable
- Clear user-facing confirmation when an action succeeds, fails, or cannot be completed

### Out of Scope
- Text chat actions
- Server browsing or management
- General Discord account management
- Non-voice Discord workflows
- Expanded voice actions beyond mute and deafen for the MVP

## Business Value
The MVP creates value by:
- Reducing the need to switch back to Discord during calls
- Helping users maintain focus in their current application
- Lowering the risk of communication mistakes caused by delayed access to mute or deafen controls
- Giving users confidence that their voice state changed as intended

## Product Principles
- The product must stay tightly focused on a small set of high-value voice controls.
- The product must favor clarity over breadth.
- The product must only claim success when a user-facing outcome is actually achieved.
- The product must communicate status clearly in both valid and invalid usage situations.

## Business Rules

> **Amendment 2026-06-08 (Phase 1, final).** Rule 3 is relaxed to **best-effort** for the MVP. A
> control path (shortcut dispatch) is proven. A verified confirmation source (Discord RPC read)
> was also proven to work, but was **intentionally dropped** to keep the product zero-setup (no
> Discord app, no OAuth). With no confirmation, the product reports that a toggle was **sent** and
> must never assert a specific resulting state it cannot verify. Restoring verified success means
> re-adding the (already-proven) RPC confirmation. See
> `vibe/phases/phase-01-results/decision-record.md`.

1. The MVP supports only two primary actions: toggle mute and toggle deafen.
2. The product serves users who are in an active Discord voice context; if no valid voice context exists, actions may remain visible but must be clearly identified as unavailable.
3. An action is considered successful only when the user’s actual Discord voice state changes as intended.
4. If an action cannot be completed, the product must clearly inform the user rather than implying success.
5. Users should be able to understand whether they can act without needing to open Discord first.
6. The expected user outcome of a successful action includes both state confidence and uninterrupted workflow.
7. The MVP must avoid expanding into non-voice Discord use cases.
8. The product should maintain a minimal-accountability trust posture, meaning users should perceive it as a narrowly scoped utility that only supports the requested voice-control purpose.
9. Future opportunities may be documented only if they remain directly adjacent to the same voice-control problem space.

## Assumptions
- Users already use Discord voice sessions as part of their normal workflow.
- Users value convenience only if the product is reliable and unambiguous.
- A narrow, high-confidence feature set is more valuable for the first release than a broad but inconsistent experience.

## Success Criteria
The first release is successful when:
- Users can reliably complete the two core voice actions from outside the Discord window.
- Users can understand when actions are available, unavailable, successful, or unsuccessful.
- Users experience reduced context switching during voice-based work sessions.
- The product becomes useful enough to be incorporated into regular workflow habits.

## User Stories
1. As a user who is working in another application while connected to Discord voice, I want to toggle mute without opening Discord so that I can manage my microphone state without breaking focus.
2. As a user who is working in another application while connected to Discord voice, I want to toggle deafen without opening Discord so that I can quickly control incoming voice audio without interrupting my current task.
3. As a user, I want to know whether a voice-control action is currently available so that I do not waste time attempting actions in invalid situations.
4. As a user, I want clear confirmation after each action so that I can trust my current mute or deafen state.
5. As a user, I want a clear explanation when an action cannot be completed so that I understand what happened and what to do next.

## Acceptance Criteria
### Story 1: Toggle Mute
1. Given the user is in a valid Discord voice context, when the user invokes the mute action, then the user’s mute state changes.
2. Given the user is currently unmuted, when the mute action is invoked successfully, then the user becomes muted and receives clear confirmation.
3. Given the user is currently muted, when the mute action is invoked successfully, then the user becomes unmuted and receives clear confirmation.
4. Given the mute action cannot be completed, when the user invokes it, then the product clearly indicates that the action was not successful.

### Story 2: Toggle Deafen
1. Given the user is in a valid Discord voice context, when the user invokes the deafen action, then the user’s deafen state changes.
2. Given the user is currently undeafened, when the deafen action is invoked successfully, then the user becomes deafened and receives clear confirmation.
3. Given the user is currently deafened, when the deafen action is invoked successfully, then the user becomes undeafened and receives clear confirmation.
4. Given the deafen action cannot be completed, when the user invokes it, then the product clearly indicates that the action was not successful.

### Story 3: Action Availability
1. Given the user is in a valid voice context, when the user views the available actions, then the mute and deafen actions are presented as available.
2. Given the user is not in a valid voice context, when the user views the available actions, then the actions remain visible but are clearly distinguished as unavailable.
3. Given an action is unavailable, when the user attempts to use it, then the product explains that the action cannot currently be completed.

### Story 4: Confirmation and Trust
1. Given an action succeeds, when the user completes it, then the product provides clear confirmation of the new voice state.
2. Given an action fails or cannot be completed, when the user attempts it, then the product provides clear, non-misleading feedback.
3. Given the user performs an action while focused on another application, when the outcome is shown, then the user can understand the result without needing to open Discord.

### Story 5: Clarity in Invalid Situations
1. Given the user attempts an action outside a valid voice context, when the action is triggered, then the product must not imply that the voice state changed.
2. Given the action cannot be completed for any business-relevant reason, when the outcome is communicated, then the explanation must be understandable and actionable from a user perspective.

## Risks and Business Considerations
- If outcomes are ambiguous, users may stop trusting the product even if the feature set is small.
- If the product expands scope too early, the MVP may lose focus and delay validation of the core use case.
- If users cannot tell whether actions are valid before attempting them, perceived usefulness will decrease.

## Future Opportunities
The following may be considered later only if they remain closely tied to the same voice-control use case:
- Additional voice-session controls adjacent to mute and deafen
- Improved workflow shortcuts around voice-session presence or status awareness
- Broader convenience actions that still serve the same in-call productivity problem

## Summary
This MVP should be treated as a narrowly scoped, high-clarity productivity utility. Its success depends less on breadth and more on whether users can trust it to change mute and deafen states reliably, understand when actions are valid, and stay focused in their current workflow.