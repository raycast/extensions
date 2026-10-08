# Voicemeeter Raycast Extension Spec (v1)

## Overview

Build a Raycast extension for controlling Voicemeeter channels with fast everyday actions (mute/unmute and volume control), while keeping the extension clean and self-contained.

## Product Goals

- Control both strips and buses from Raycast.
- Provide a hybrid UX: list/dashboard + targeted quick actions.
- Organize commands into a small domain-oriented set.
- Support global volume presets with per-target overrides.
- Provide undo/history safeguards without slowing core interactions.

## Explicit v1 Non-Goals

- No advanced routing graph/editor.
- No macro buttons/scenes integration.
- No always-on background daemon/server process.

## Platform and Compatibility

- Windows-only.
- Robust across Voicemeeter editions (Standard, Banana, Potato).
- Unsupported controls must be hidden based on detected capabilities.

## UX and Command Architecture

- Primary interaction model: hybrid (dashboard/list + quick actions).
- Domain command structure (few commands, not many micro-commands):
  - `Mute`
  - `Volume`
  - `Profiles`
  - `Status`
- Target ordering in UI is fixed Voicemeeter order.
- Target identity uses name first, with index fallback.

## State Refresh Model

- Refresh state when command opens.
- No continuous live polling in v1.

## Command Behavior

### Mute

- Must support user-selectable behavior for stale/unknown state:
  - optimistic toggle, or
  - refresh then toggle, or
  - explicit idempotent mute/unmute.

### Volume

- Support both:
  - step-based adjustments, and
  - absolute target values.
- Default quick steps: ±0.5 dB and ±1 dB.
- Invalid values must be prevented before execution.

### Profiles

- Preset model: global presets with per-target overrides.
- Storage: Raycast local storage only.

### Status

- Show connection status and current mute/volume snapshots.

## Safety, Undo, and History

- No confirm dialogs by default.
- Provide undo window + short global history stack of last 10 changes.
- Default undo TTL: 10 seconds.
- Undo TTL must be configurable in settings.

## Error and Failure UX

- On API/unavailable failures, use silent-skip behavior with light signals:
  - subtle toast on user-initiated action, and
  - non-intrusive status indicator in UI.

## Execution and Concurrency

- Use a global serialized action queue.
- Consistency is prioritized over raw speed.

## Launch and Connection Behavior

- If Voicemeeter is closed, offer launch.
- Launch support requires one-time executable path selection.

## Settings Surfaces

- Use both:
  - Raycast extension preferences, and
  - in-command quick settings.

## Diagnostics and Observability

- Minimal diagnostics only for v1 (human-friendly, low noise).

## Implementation Constraint

- Integration strategy should be whichever is cleanest for a native-feeling Raycast extension and does not require a separate always-running server process.

## Test Strategy (v1)

- Manual smoke testing is sufficient for v1.

## Definition of Done (v1)

`v1` is complete when everything in this document is implemented together (full discussed scope), including:

- hybrid UX,
- strips+buses controls,
- mute + volume (step/absolute),
- presets (global + per-target overrides),
- undo/history behavior,
- launch offer + executable selection,
- compatibility handling across editions,
- settings integration,
- status command behavior,
- and non-goal boundaries respected.

## References

- Voicemeeter Remote API PDF: [VoicemeeterRemoteAPI.pdf](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf)
- Voicemeeter SDK repository: [vburel2018/Voicemeeter-SDK](https://github.com/vburel2018/Voicemeeter-SDK)
