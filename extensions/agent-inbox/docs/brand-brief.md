# Agent Inbox: Product and Logo Brief

**English** | [简体中文](brand-brief.zh-CN.md)

## One sentence

Subscribe to Claude Code and Codex sessions, get notified when they need your input, and jump back to the conversation.

Agent Inbox is a macOS Raycast extension for developers working across multiple AI coding sessions. It brings conversations from terminals and desktop clients into a subscription list, showing which sessions are running, which need attention, and where to continue.

## The problem

A developer may have several agents fixing bugs, writing code, or investigating approaches in different projects and windows. One needs permission, another asks a question, and a third has finished its current turn. Checking each window interrupts work, and unanswered requests are easy to miss.

Agent Inbox lets users follow selected sessions, receive a reminder when their input is needed, and return to the original context.

## Current features

| Capability                | What it gives the user                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| All Sessions              | Find Claude Code and Codex conversations by title, project, or ID, including past work                                         |
| Subscriptions             | Follow selected sessions; temporarily dismiss handled work until a new state or request arrives                                |
| Status and notifications  | Distinguish running, waiting, turn ended, explicitly completed, and unknown; notify only for subscribed work needing attention |
| Return to context         | Focus the original desktop conversation, terminal tab, or tmux pane, with recovery options when exact targeting fails          |
| Menu bar                  | See subscribed sessions and a waiting count                                                                                    |
| Optional full-text search | Enable a local index of user and agent messages and see matching excerpts                                                      |
| Title synchronization     | Keep lists, menu bar, and notifications aligned with current source titles                                                     |

Typical workflow: subscribe to two project sessions → do other work → an agent requests confirmation → receive a notification → jump to that conversation → respond and continue.

## Product boundaries

- It manages existing conversations. It does not orchestrate agents, assign work, generate code, or approve requests.
- The current platform is Raycast on macOS. Built-in sources are Claude Code and Codex; the built-in notification channel is macOS.
- Cloud-only Claude Code sessions can be subscribed to and reopened using explicit window IDs, and open-window titles can sync. Without local records or hooks, monitoring and input reminders are unavailable.
- State and optional search indexes stay on the Mac. There is no cross-device cloud sync.
- “Turn ended” does not mean the entire task is complete. Brand copy should preserve that distinction.

## Selected logo

The selected artwork combines an envelope-shaped speech bubble, the OpenAI mark, and a small crab. Original path geometry is preserved. The crab uses warm terracotta (`#D97757`) in both themes, with dark eyes for contrast.

- **Light theme:** pale apricot, from `#FFF1D6` to `#FFD6BC`.
- **Dark theme:** charcoal, from `#34302C` to `#1E1C1B`.
- **Menu bar:** the envelope outline with transparent cutouts. Raycast applies a theme-aware tint and shows orange when attention is needed.

README and Raycast command icons switch between light and dark automatically. Session rows retain their individual agent icons to identify the source.

## Asset files

| File                                                                                          | Use                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Original SVG](../media/logo-original.svg)                                                    | Supplied artwork, preserved without edits                            |
| [Colored symbol](../media/logo.svg)                                                           | Transparent logo with the terracotta crab                            |
| [Light source](../media/app-icon.svg) · [Dark source](../media/app-icon@dark.svg)             | Editable vector sources for the rounded app icons                    |
| [Light PNG](../assets/agent-inbox-icon.png) · [Dark PNG](../assets/agent-inbox-icon@dark.png) | 512 × 512 Raycast icons; the `@dark` suffix selects the dark theme   |
| [Menu-bar source](../media/menu-bar-icon.svg)                                                 | Simplified symbol, exported to `assets/menu-bar-icon.png` at 44 × 44 |

README PNG copies live under `media/`. Keep them identical to the runtime icons when re-exporting. See [asset provenance](../media/README.md).
