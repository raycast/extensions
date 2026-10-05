# Synap Raycast Extension

Connect your [Synap](https://synap.live) data pod to Raycast.

## Features

- **Ask Synap** — provenance-tagged retrieval across entities, runbooks, and remembered facts
- **Capture to Synap** — selected text, clipboard, and browser pages enter one reviewable capture flow
- **Raw capture** — preserve the original text as a governed proposal when you do not want AI structure, or when structuring is unavailable
- **Live-schema creation** — create a known kind from its base schema, or a workspace-scoped kind after an explicit workspace choice
- **Today and menu bar** — keep upcoming work close without creating a second task system
- **Raycast AI tools** — `@synap` orients to the live pod, progressively loads only skills the caller is allowed to use, and discovers governed actions before it runs them

## Setup

1. Install the extension
2. Open Raycast → Extensions → Synap → Preferences
3. Run **Connect to Synap Pod** and follow the Cloud or pod-admin flow. It provisions a dedicated Raycast agent key.
4. Select a workspace lens if you want one; pod-wide reads and capture remain available without a lens.

## Getting an API Key

**Via CLI:**

```bash
npx @synap/cli init
synap connect --target=raycast
```

**Via Raycast:**
Use the `Connect to Synap Pod` command — it opens the managed or pod-admin registration flow and returns with a dedicated Raycast agent key.

**Manual:**
Paste a Hub Protocol key only for read access or explicit Raycast UI commands. Raycast AI refuses to mutate with a human key: reconnect through the managed registration flow (or run `synap connect --target=raycast`) so proposals remain agent-attributed and reviewable.

## AI Tools

Once configured, type `@synap` in Raycast AI Chat to access:

- Ask your knowledge graph before answering or writing
- Orient when context is unclear and discover only the base schema needed next; inspect an explicit workspace overlay only when needed
- Load the relevant caller-visible Synap skill without bulk-loading instructions
- Discover live capability state, load just-in-time action guidance, and run only governed, runnable actions
- Capture a reviewed graph proposal, create typed entities, and send messages to channels

The AI surface never treats a proposal as a failure. A proposal means Synap queued the change for your review; a denied or degraded result is shown honestly. AI writes require the dedicated Raycast agent key described above.

Raycast AI tools are a curated Hub projection — not a second product surface. Capability verbs go through `list-actions` / `run-action`; Connect provisions the agent key those writes need. `synap raycast generate` is a hidden power-user Script Command escape hatch, not the default path. For full MCP inside Raycast, use `synap connect --target=raycast --with-mcp`.

Requires Raycast Pro.
