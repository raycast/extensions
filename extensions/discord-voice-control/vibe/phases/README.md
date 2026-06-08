# Raycast Discord Extension Implementation Phases

## Purpose
This folder contains the implementation phase plan for the MVP Raycast Discord Extension. The goal is to build a narrow local macOS utility that lets a user toggle Discord mute and deafen from Raycast, while clearly reporting when an action is available, unavailable, successful, failed, or unknown.

The plan is written for a solo developer using AI assistance. Each phase is intended to produce concrete implementation progress, validation evidence, or a go/no-go decision.

## Source Inputs
- `vibe/requirements/business-requirement.md`
- `vibe/requirements/product-rules.md`
- External platform research completed on 2026-06-06

## Platform Research Summary

### Raycast
- Raycast extensions are built with TypeScript and React. Current Raycast setup guidance lists Raycast 1.26.0 or higher, Node.js 22.14 or higher, and npm 7 or higher as development prerequisites.
- Raycast manifest command names map to files in `src`, and commands can run in `view`, `no-view`, or `menu-bar` mode.
- `no-view` commands are a good fit for fast toggle actions because they can run async work without opening a full UI.
- A `view` command is a better fit for `Check Voice Control Status` because it can show readiness, missing permissions, and troubleshooting actions.
- Raycast preferences can hold configuration such as preferred control mechanism, shortcut assumptions, app selection, and diagnostic logging opt-in.
- Raycast toasts and HUD feedback should be used for concise action outcomes.

Useful Raycast sources:
- https://developers.raycast.com/basics/getting-started
- https://developers.raycast.com/information/manifest
- https://developers.raycast.com/information/lifecycle
- https://developers.raycast.com/api-reference/preferences
- https://developers.raycast.com/api-reference/feedback/toast

### Existing Raycast Discord Extension
- The existing Raycast Store Discord extension is webhook-focused and described as sending messages to Discord channels with webhooks.
- It does not appear to cover local voice mute/deafen controls, so this MVP should be planned as a separate voice-control utility rather than an incremental webhook feature.

Source:
- https://www.raycast.com/Aayush9029/discord

### Discord API And Local Client Constraints
- Discord's Voice State object includes `self_mute` and `self_deaf`, which are the user-local states the MVP cares about.
- Discord's REST `Get Current User Voice State` can read a current user's voice state for a guild, but `Modify Current User Voice State` does not expose general self mute/deafen parameters. Its documented parameters are stage-channel-oriented fields such as `channel_id`, `suppress`, and `request_to_speak_timestamp`.
- Discord Gateway Voice State Update payloads include `self_mute` and `self_deaf`, but this is for a client establishing or updating its own voice connection, not a supported way for a Raycast extension to control the official logged-in desktop client. Avoid designs that require user tokens, selfbot behavior, or undocumented client internals.
- Discord local RPC over IPC is the closest documented local client surface. It documents `GET_VOICE_SETTINGS`, `SET_VOICE_SETTINGS`, `VOICE_SETTINGS_UPDATE`, `mute`, and `deaf`. However, RPC commands require authentication, relevant RPC voice scopes can require Discord approval, OAuth token exchange can introduce a remote auth dependency, and Discord documents voice setting lock behavior while an app is controlling settings.
- Because of these constraints, Discord RPC should start as a feasibility spike, not the assumed MVP path. It may become a confirmation/control path only if it satisfies the product's local-only, trust, and distribution requirements.

Useful Discord sources:
- https://docs.discord.com/developers/resources/voice
- https://docs.discord.com/developers/events/gateway-events
- https://docs.discord.com/developers/topics/rpc
- https://docs.discord.com/developers/topics/oauth2

## Planning Position
The most important project risk was never Raycast scaffolding — it was whether the extension can
reliably cause (and ideally confirm) the user's actual Discord mute/deafen state without misleading
the user. Feasibility ran first (Phase 1) for exactly this reason.

**Resolved:** Phase 1 proved a reliable control path (shortcut dispatch). An acceptable confirmation
strategy was proven viable (RPC read) but **intentionally dropped** in favor of a zero-setup product;
the MVP therefore ships **best-effort**, where the trust safeguard shifts from state confirmation to
strict messaging discipline (report what was *sent*, never claim an unverified state). If the
best-effort posture proves insufficient, the documented upgrade is to re-add RPC confirmation.

## Phase Index

| Phase | File | Main Outcome |
| --- | --- | --- |
| 1 | `phase-01-feasibility-and-technical-decisions.md` | Prove or reject viable control and confirmation mechanisms |
| 2 | `phase-02-extension-foundation.md` | Create Raycast extension skeleton, commands, types, and module boundaries |
| 3 | `phase-03-status-and-capability-detection.md` | Build status checks and availability model |
| 4 | `phase-04-shortcut-control-path.md` | Implement the shortcut-based control path (sole MVP mechanism) |
| 5 | `phase-05-ui-automation-fallback.md` | **SKIPPED** — UI fallback not built for MVP (no accessible labels) |
| 6 | `phase-06-confirmation-and-user-feedback.md` | Best-effort user-facing messaging (no confirmation source) |
| 7 | `phase-07-testing-and-diagnostics.md` | Add automated coverage and local diagnostics |
| 8 | `phase-08-manual-validation-and-release-readiness.md` | Complete real Discord validation and release readiness |

## Phase 1 Outcome (decided 2026-06-08)
Phase 1 is complete. **Decision: shortcut-only control, best-effort trust posture.** The shortcut
dispatch path was proven to toggle mute/deafen from outside Discord. No state-confirmation source
is implemented (Discord RPC read was proven viable but intentionally dropped to keep the product
zero-setup; it is the documented upgrade path to restore verified success). The UI-automation
fallback (Phase 5) is **skipped** because Discord exposes no accessible mute/deafen labels. See
`vibe/phases/phase-01-results/` for the decision record, feasibility matrix, and test notes.

## Recommended Execution Order
Run the phases sequentially. Phase 5 is skipped; proceed Phase 4 → Phase 6.

If a phase produces a blocking finding, update the requirements before continuing. The product rules are intentionally strict: the extension must not imply that mute or deafen changed unless the implementation has enough evidence to support that claim.

## Cross-Phase Definition Of Done
- The extension remains local-only unless requirements are explicitly changed.
- The command surface remains exactly three commands for MVP: Toggle Mute, Toggle Deafen, Check Voice Control Status.
- Every expected operational outcome maps to a typed result, stable reason code, and user-facing message.
- Automation details remain behind infrastructure adapters.
- Success wording is **best-effort** ("sent"); no outcome ever claims a confirmed voice state
  ("muted"/"deafened"), since the MVP has no confirmation source.
- A failed or unavailable action never uses success wording.
- Automated tests cover domain decisions and result mapping.
- Manual real-world testing against Discord on macOS is treated as a release gate.
