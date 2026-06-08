# Product Rules Document

## Project
Raycast Discord Extension

## Document Purpose
This document defines the technical product rules for the MVP implementation of the Raycast Discord Extension. It translates the business requirements into engineering constraints, implementation patterns, quality standards, and delivery rules so the product can be built with a narrow scope and a high-trust user experience.

## Product Positioning
The product is a local-only Raycast extension for macOS that helps users control Discord voice states without leaving their current application. The MVP is intentionally narrow. Every technical decision should optimize for reliability, clarity of outcome, and minimal operational surface area.

## Technical Goals
- Provide two fast commands for Discord voice control: toggle mute and toggle deafen.
- Detect whether the requested action is available before claiming success.
- Confirm success only after the implementation has enough evidence that Discord state changed.
- Fail clearly and safely when the action cannot be completed.
- Keep the MVP local-only, with no backend services, remote storage, or network dependency.

## Non-Goals
- No Discord text chat features.
- No server, channel, or account management features.
- No cloud sync, telemetry backend, or hosted diagnostics.
- No broad automation framework beyond the minimum needed to support mute and deafen.
- No long-term state history, analytics warehouse, or embedded database for the MVP.

## Implementation Assumptions
- Platform: macOS only for the MVP.
- Extension runtime: Raycast extension using TypeScript.
- Integration model: Raycast command layer plus a macOS automation layer.
- Primary control path: trigger Discord global shortcuts.
- Fallback control path: macOS UI automation against Discord when shortcut execution is unavailable or insufficient.
- Persistence model: Raycast preferences only.
- Deployment model: local-only execution on the user machine.

## Stack Rules

### Core Stack
- Use TypeScript for all extension code.
- Use the Raycast API as the only command and user-interface surface.
- Use Node-compatible utilities only when they directly support command execution, process control, or automation orchestration.
- Keep all automation logic behind internal interfaces so the command layer does not depend directly on AppleScript, shell scripts, or UI scripting details.

### macOS Automation Layer
- Treat macOS automation as an adapter layer, not as business logic.
- Prefer a shortcut-based control path first because it is simpler, less invasive, and lower maintenance than direct UI automation.
- Implement UI automation only as a fallback path for the same two MVP actions.
- Require explicit handling for macOS permission dependencies such as Accessibility access or automation permissions.
- Surface permission failures as actionable user-facing outcomes, not low-level script errors.

### Local-Only Architecture
- The MVP must run without any backend, API server, webhook, or third-party hosted dependency.
- The extension must not require user login beyond the user already being logged into Discord locally.
- Avoid any design that depends on remote feature flags, remote state, or cloud-based action confirmation.

## Command Surface Rules
- Provide exactly three Raycast commands in the initial technical design:
  - Toggle Mute
  - Toggle Deafen
  - Check Voice Control Status
- The action commands are the primary user entry points and must remain optimized for speed.
- The status command exists to support availability checks, troubleshooting, and user confidence without forcing a state change.
- Do not introduce extra commands unless they directly support the same voice-control problem.

## Recommended Module Boundaries
- `commands`: Raycast command entry points and view bindings only.
- `application`: use-case logic for toggle mute, toggle deafen, and status evaluation.
- `domain`: action result types, availability states, error categories, and state transition rules.
- `infrastructure/discord-control`: adapters for shortcut execution and UI automation.
- `infrastructure/system`: macOS permission checks, process detection, and shell execution helpers.
- `shared`: constants, logging helpers, serialization helpers, and user-facing message templates.

## Architecture Rules

### Separation of Concerns
- Command handlers may orchestrate workflows, but they must not contain raw automation code.
- All Discord interaction must go through an internal control interface.
- Business rules for success, failure, and availability must remain independent of the implementation mechanism.
- The fallback decision between shortcut control and UI automation must be centralized in one orchestration layer.

### Capability Detection
- Detect whether Discord is installed or running before attempting an action when that check is available at reasonable cost.
- Detect whether macOS permissions required for the selected mechanism are available.
- Determine whether the requested action is currently executable before announcing success.
- If capability cannot be determined confidently, return a clear degraded-state response rather than assuming success.

### Success Semantics

> **Amendment 2026-06-08 (Phase 1, final).** Success semantics are relaxed to **best-effort** for
> the MVP. Control = shortcut dispatch; **no confirmation source is implemented** (RPC read was
> proven to work but intentionally dropped to keep the product zero-setup). A command is
> "successful" when shortcut dispatch completes without error, and the user-facing message
> describes the **action sent** ("Toggle mute sent"), never an asserted resulting state ("You are
> now muted"). The verified-state rules below describe the target for when RPC confirmation is
> re-added. See `vibe/phases/phase-01-results/decision-record.md`.

- A command is successful only when the extension has enough evidence that Discord voice state changed as intended.
- Shortcut dispatch alone is not sufficient evidence of success if the implementation has reason to doubt whether Discord received or applied the action.
- If confirmation is indirect, the outcome must be framed as best-effort only when the product rules explicitly allow that wording.
- The default MVP rule is to avoid ambiguous success messaging.

### Fallback Strategy
- Attempt the shortcut path first when prerequisites are met.
- Fall back to UI automation only when shortcut execution is unavailable, blocked, or returns insufficient confidence.
- Do not attempt repeated uncontrolled retries.
- At most one fallback path may be attempted per user invocation.
- Log which mechanism was used for each execution result.

## API Conventions

### Internal API Style
- Prefer small, explicit interfaces over broad service classes.
- Use result-returning APIs instead of exception-driven control flow for expected operational outcomes.
- Reserve thrown exceptions for truly unexpected failures or programmer errors.
- Keep asynchronous boundaries explicit with `async` and `await`.
- Do not expose raw shell output, AppleScript output, or UI automation details outside infrastructure layers.

### Result Shape
- Standardize action responses around a single discriminated result type.
- Every action result should include:
  - requested action
  - execution mechanism
  - availability status
  - outcome status
  - user-facing message
  - machine-readable reason code
  - optional diagnostic detail for logs only
- Outcome statuses should be limited to a constrained set such as `success`, `unavailable`, `failed`, and `unknown`.

### Error Categories
- Normalize operational failures into stable categories.
- Minimum categories:
  - Discord not running
  - Discord unavailable or not detectable
  - Missing macOS permission
  - Shortcut not configured or not effective
  - UI automation failed
  - State could not be confirmed
  - Unexpected internal error
- User-facing copy must be written from these categories rather than from raw exception strings.

### Naming Conventions
- Use verbs for use cases: `toggleMute`, `toggleDeafen`, `checkVoiceControlStatus`.
- Use nouns for adapters and capabilities: `DiscordController`, `ShortcutController`, `UiAutomationController`, `PermissionProbe`.
- Keep status enums and result codes stable because they define the product trust model.

## Database and Persistence Rules

### Database Requirement
- No dedicated database is required for the MVP.
- Do not introduce SQLite, Realm, IndexedDB, or any equivalent embedded store unless a later requirement proves that Raycast preferences are insufficient.

### Allowed Persistence
- Use Raycast preferences for static user configuration only.
- Valid preference examples:
  - preferred control mechanism
  - Discord shortcut assumptions or key mapping metadata
  - diagnostic logging opt-in
  - app detection overrides if required
- Do not store long-term action history in preferences.
- Do not persist sensitive system state or unnecessary runtime snapshots.

### Runtime State
- Keep runtime action state in memory only.
- Cached capability checks may be used for the current session if they reduce repeated permission prompts or unnecessary system calls.
- Any cache must expire aggressively and must never be treated as proof of current Discord voice state.

## Testing Standards

### Test Pyramid
- Require unit tests for domain rules, result mapping, fallback selection, and user-facing message selection.
- Require mocked integration tests for the application layer and infrastructure contracts.
- Require a manual end-to-end checklist for real Discord and macOS behavior.

### Unit Test Scope
- Test success and failure outcomes for both toggle actions.
- Test availability-state decisions.
- Test fallback routing decisions.
- Test normalization of permission failures and automation failures.
- Test message generation to ensure no failure case implies success.

### Mocked Integration Test Scope
- Mock the shortcut adapter and UI automation adapter independently.
- Verify that the command layer selects the right mechanism under different capability states.
- Verify that one failed primary path can trigger one fallback path when allowed.
- Verify that unavailable actions remain visible and produce explanatory output.

### Manual End-to-End Checklist
- Confirm mute toggle while Discord is active.
- Confirm mute toggle while another application is focused.
- Confirm deafen toggle while another application is focused.
- Confirm behavior when Discord is closed.
- Confirm behavior when required macOS permissions are missing.
- Confirm behavior when the shortcut path fails and fallback is used.
- Confirm that user feedback matches the actual Discord outcome.

### Test Environment Rules
- Automated tests must not depend on a live Discord session in CI.
- Real Discord validation is a manual release gate for the MVP.
- New automation mechanisms must add both mocked integration coverage and manual checklist updates.

## Code Style and Quality Rules

### Language Rules
- Enable TypeScript strict mode.
- Avoid `any` except at tightly isolated boundaries where external tooling forces it.
- Prefer explicit types at module boundaries and inferred types inside small local scopes.
- Use discriminated unions for action results and error categories.

### Linting and Formatting
- Use ESLint for static analysis.
- Use Prettier for formatting.
- CI or local quality checks must fail on lint errors and type errors.
- Formatting rules should be automated rather than manually enforced.

### Style Conventions
- Prefer small pure functions for rule evaluation.
- Keep command files thin.
- Avoid boolean parameter overloads when a named option object is clearer.
- Prefer stable constant maps or enums for outcome codes over duplicated string literals.
- Avoid hidden side effects across modules.

### Dependency Rules
- Add dependencies only when they reduce real implementation risk.
- Prefer built-in platform capabilities and the Raycast platform before adding third-party wrappers.
- Avoid large automation frameworks unless the fallback path cannot be maintained without them.
- Every dependency added to automation or shell execution must be justified by reliability or maintainability.

## Observability and Diagnostics Rules
- Support lightweight structured logging for local diagnostics.
- Logging must help explain which mechanism ran, which capability checks passed or failed, and why the final outcome was chosen.
- Logs must never be required for normal user understanding.
- User-facing messages should remain concise; diagnostic detail belongs in logs only.
- Do not send logs to any remote service in the MVP.
- If diagnostic logging is persisted or exported later, it must be opt-in.

## User Feedback Rules
- Every command invocation must end in one clear user-facing outcome.
- Success messages must describe the resulting state, not just the attempted action.
- Failure messages must explain why the action could not be completed in user terms.
- Unavailable-state messaging must help the user decide what to do next, such as opening Discord or granting permissions.
- The product must never imply that mute or deafen changed when the implementation cannot support that claim.

## Security and Privacy Rules
- Keep the product local-only.
- Do not collect account data, message data, or channel content.
- Request only the macOS permissions needed for the chosen control mechanism.
- Minimize shell execution scope and sanitize any constructed command inputs.
- Do not store sensitive local system details beyond what is needed for immediate execution.

## Delivery Rules

### MVP Completion Criteria
- Both toggle commands work through the primary shortcut path when prerequisites are satisfied.
- Fallback UI automation exists for at least the same two actions.
- The status command can explain whether the product is ready to act.
- The extension distinguishes between success, failure, and unavailable states.
- Manual real-world validation has been completed against Discord on macOS.

### Change Management
- Any new feature proposal must show that it remains adjacent to the same voice-control problem space.
- Any expansion beyond mute, deafen, and status must prove that it does not reduce clarity or trust in the MVP.
- Any change to success semantics or error wording requires corresponding test updates.

## Implementation How

### Phase 1: Baseline Extension Skeleton
- Create Raycast commands for toggle mute, toggle deafen, and status.
- Establish shared result types and error categories.
- Implement a single application service that coordinates execution flow.

### Phase 2: Primary Control Path
- Implement shortcut dispatch for mute and deafen.
- Add capability checks for Discord presence and shortcut preconditions where feasible.
- Return normalized results and user-facing feedback from the primary path.

### Phase 3: Fallback Path
- Implement UI automation adapters behind the same control interface.
- Add permission probes and fallback routing rules.
- Ensure the fallback path can be invoked only once per action attempt.

### Phase 4: Confidence and Status
- Implement the status command to report readiness, missing permissions, and likely control path.
- Refine success criteria so the product reports only high-confidence outcomes.
- Add structured diagnostics for local troubleshooting.

### Phase 5: Validation
- Complete unit and mocked integration coverage for decision logic and result mapping.
- Run the manual end-to-end checklist against Discord on macOS.
- Adjust messaging and capability rules until the product behavior matches real outcomes.

## Open Technical Questions for Later Validation
- How reliably can Discord global shortcuts be triggered when Discord is unfocused on the target macOS setup?
- What evidence can the extension use to confirm a state change without relying on undocumented Discord internals?
- Which specific UI automation hooks are stable enough to use as fallback without creating excessive maintenance risk?
- What minimum permission set provides acceptable reliability while keeping the user trust posture narrow?

## Summary
This product rules document defines a strict MVP: a local-only Raycast extension, built in TypeScript, that uses shortcuts first and UI automation second to control Discord mute and deafen. The engineering standard is high clarity, explicit result semantics, minimal persistence, strong typed boundaries, and testing that reflects the real operational risks of macOS automation.
