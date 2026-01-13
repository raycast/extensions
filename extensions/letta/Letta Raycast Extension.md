# PRD: Letta for Raycast Extension

## 1. Product Summary

**Product**  
A Raycast extension that connects to a user’s Letta account and lets them chat with their stateful AI agents, inspect memory blocks, and manage agents, directly from the Raycast command bar.

**Core value**  
**“AI that actually remembers you, inside Raycast.”**  
Same Letta capabilities as the Telegram bot (agents, memory, tools), but adapted to a local, single-user, keyboard-first desktop workflow.

---

## 2. Objectives & Success Criteria

### 2.1 Objectives

1. **Expose Letta’s stateful agents inside Raycast**  
   Single-user, single Letta account, multiple agents.

2. **Deliver a fast, low-friction chat workflow**  
   Query any selected agent with minimal keystrokes.

3. **Make memory and reasoning inspectable**  
   Users can see what the agent stores and how it reasons.

4. **Minimize configuration / infrastructure overhead**  
   No webhooks, no servers, no DB. Pure client-side + Letta API.

### 2.2 Success metrics (v1)

Ranked:

1. **Activation**  
   - ≥ 60% of users who install the extension successfully configure an API key and send at least 1 message.

2. **Retention (weekly)**  
   - ≥ 40% of activated users run at least 5 Letta commands per week.

3. **Performance**  
   - 95th percentile time from “submit query” to first token ≤ 4s (assuming Letta SLA).

4. **Reliability**  
   - < 2% of requests fail for client-side reasons (bad state, missing config, unhandled errors).

5. **Transparency / trust**  
   - Qualitative feedback: users can see and understand memory & reasoning without feeling overwhelmed (validate via early testers).

---

## 3. Scope & Phasing

### 3.1 Phase overview

| Phase | Name                 | Scope (high-level)                                                                                             |
|-------|----------------------|----------------------------------------------------------------------------------------------------------------|
| 1     | Core Chat            | Auth via API key, list/select agents, send question, display answer, basic errors                              |
| 2     | Agent Management     | Create from template(s), delete agents, switch agents quickly, basic project support                          |
| 3     | Memory & Reasoning   | List/view memory blocks, toggle reasoning, show tool usage in UI                                              |
| 4     | Advanced / Nice-to-haves | Tool attach/detach, favorites/shortcuts, menu bar quick access, richer streaming UI, optional OAuth |

**This PRD covers Phases 1–3 in detail. Phase 4 is directional.**

---

## 4. Users & Key Use Cases

### 4.1 Primary user

- Power user / developer / knowledge worker who:
  - Uses Raycast as daily command center.
  - Already uses Letta (or is willing to).
  - Wants persistent-memory AI agents embedded in desktop workflow.

### 4.2 Core use cases (ranked)

1. **Quick “context-aware” Q&A**  
   - Ask questions (“summarize this”, “generate a draft”, “explain this code”) and leverage agent’s long-term memory.

2. **Task-specific agents**  
   - Maintain multiple specialized agents (coding, research, planning) and switch between them quickly.

3. **Inspect “what the agent knows”**  
   - View blocks like `persona`, `human`, `working_theories` to understand and adjust how the agent models the user.

4. **Debug agent behavior**  
   - See reasoning traces and tool usage when desired; hide noise when not.

---

## 5. Functional Requirements

### 5.1 Commands overview

Raycast extension will ship (minimum) these commands:

| Command ID        | Title                       | Type   | Phase |
|-------------------|-----------------------------|--------|-------|
| `chat`            | Chat with Letta Agent       | View   | 1     |
| `agents`          | Manage Letta Agents         | View   | 2     |
| `memory`          | View Agent Memory Blocks    | View   | 3     |
| `create-agent`    | Create Letta Agent from Template | Form | 2     |

Preferences (global, not commands):

- Letta API key (required).
- Optional base URL (self-hosted).
- Show reasoning toggle.
- Timezone (optional, default system).

---

### 5.2 Authentication & Configuration

**F1. API key management**

- **F1.1** User can configure Letta API key via Raycast preferences:
  - `apiKey`: type `password`, required.
  - `baseUrl`: optional, text; if empty, default Letta Cloud.
- **F1.2** Extension validates the key on first use:
  - On first `chat`/`agents` command run, call a cheap Letta endpoint (`agents.list` or similar).
  - On failure: show clear error and instructions.
- **F1.3** API key is stored only via Raycast secure storage / encrypted preferences.
- **F1.4** No multi-user / multi-account in v1.

**F2. Preferences**

- **F2.1** `showReasoning` (bool, default false):
  - Controls whether reasoning and tool events are shown in UI.
- **F2.2** `timezone` (optional string)
  - Default: system timezone; used when constructing context strings.
- **F2.3** `baseUrl`:
  - If non-empty, used as Letta API base; otherwise use cloud default.

---

### 5.3 Agent discovery & selection

**F3. Agent listing**

- **F3.1** `Agents` command lists agents for the active project:
  - Uses Letta `agents.list` API.
  - Displays: name, project name (or slug), description snippet.
- **F3.2** List is searchable by agent name and description.
- **F3.3** Empty state:
  - If no agents: show call-to-action to create new agent (`Create Agent` command or action).

**F4. Active agent selection**

- **F4.1** User can set an “Active Agent”:
  - From `Agents` list: action “Set as Active Agent”.
  - From `Create Agent`: on success, newly-created agent becomes active.
- **F4.2** Active agent is persisted using local storage (`useLocalStorage`).
- **F4.3** `Chat` command always targets the active agent:
  - If no active agent: show prompt to select/create agent and provide action to open `Agents`/`Create Agent`.

**F5. Project awareness (simple)**

- **F5.1** For v1, assume default project if Letta provides it via API.
- **F5.2** Optional: expose “Project” filter in `Agents` command once Letta project APIs are stable:
  - Minimal: show project name/slug in agent list; filter is a later-phase enhancement.

---

### 5.4 Chat experience

**F6. Chat input & output**

- **F6.1** `Chat` is a Raycast view that:
  - Shows a prompt input (single-line or multi-line).
  - Shows response area as Markdown (`Detail` / custom view).
- **F6.2** User flow:
  1. Invoke `Chat`.
  2. Type question.
  3. Submit.
  4. See loading indicator and then the agent’s answer.
- **F6.3** Agent response:
  - At minimum: show final `assistant_message` content.
  - Display as Markdown (headings, bullet points, code blocks).

**F7. Streaming behavior**

- **F7.1** v1: allowed approach:
  - Call Letta streaming endpoint and buffer content locally.
  - UI shows spinner until stream completes, then displays full answer.
- **F7.2** Later (Phase 4): upgrade to incremental streaming:
  - Update Markdown view as tokens/chunks arrive.
  - Must remain responsive and not block Raycast UI.
- **F7.3** Timeouts:
  - If no events received for > 60s, abort and show error.
  - Show a “Try again” action.

**F8. Context construction**

- **F8.1** For each user message, extension will:
  - Create one Letta user message with:
    - `type: "text"`.
    - Content block that includes:
      - Sender metadata (Raycast + username if available).
      - Timestamp with timezone.
      - The actual user question.
  - Example (conceptual):

    ```text
    [Message from Raycast user John at 2025-01-10T09:00:00-05:00]

    John's message:
    <user input>
    ```

- **F8.2** No local conversation history is required:
  - Letta agents handle persistence and recall.
- **F8.3** v1: no handling of images/audio; text-only.

**F9. Reasoning & tool events in chat**

- **F9.1** When Letta sends `reasoning_message` and `tool_call_message`, extension maps them to UI as “Agent insights” if `showReasoning` is enabled:
  - Show them in a secondary collapsible section (e.g., below answer with heading “Agent’s reasoning & actions”).
- **F9.2** If `showReasoning` is disabled:
  - Ignore reasoning/tool events for UI; log errors only if parsing fails.
- **F9.3** Event mapping behavior (Phase 3):
  - `assistant_message` → main answer.
  - `reasoning_message` → reasoning section.
  - `tool_call_message` → tool usage entries (e.g., “Agent searched: <query>”).
  - `tool_return_message` (if exposed) → optional details in reasoning section.

**F10. Error handling in chat**

- **F10.1** Detect and surface Letta API errors:
  - Show clear message, e.g.:
    - “Letta error (401): Invalid or expired API key.”
    - “Letta error (429): Rate limit exceeded. Wait and retry.”
- **F10.2** Handle network errors explicitly:
  - Offline / DNS / timeout → show “Network error. Check connection or Letta status.”
- **F10.3** Provide actions:
  - “Open Preferences” (for key problems).
  - “Retry” (resend same query).

---

### 5.5 Agent creation & management

**F11. Create agent from template**

- **F11.1** `Create Agent` command:
  - Form with:
    - Agent name.
    - Template selection (e.g., `Default`, `Ion`).
    - Optional description.
    - Optional model selection (if Letta API exposes).
- **F11.2** Templates:
  - Implement at least one higher-memory template (Ion-like) using Letta’s template API or pre-defined prompt/memory settings, mirroring Telegram Ion template semantics.
- **F11.3** On submit:
  - Call Letta `agents.create`.
  - On success:
    - Persist agent id.
    - Set as active agent.
    - Offer to open chat directly with new agent.

**F12. Delete agent (Phase 2)**

- **F12.1** From `Agents` command, allow “Delete agent” action:
  - Confirm dialog with agent name.
- **F12.2** If deleting the currently active agent:
  - Clear active agent state.
  - Prompt user to select another agent.

---

### 5.6 Memory inspection

**F13. List memory blocks**

- **F13.1** `Memory` command:
  - Requires active agent.
- **F13.2** Uses Letta `agents.blocks.list(agent_id)` to fetch block metadata.
- **F13.3** UI:
  - List of blocks: label, optional short preview or type.
  - Search by label.
- **F13.4** Empty state:
  - “No memory blocks found for this agent.”

**F14. View memory block details**

- **F14.1** Selecting a block opens a detail view:
  - Shows label and full text content.
  - Rendered as Markdown or plain text with monospaced font.
- **F14.2** v1: read-only.
- **F14.3** Later (optional): “Copy to clipboard” action.

---

### 5.7 Reasoning visibility control

**F15. Reasoning toggle**

- **F15.1** `showReasoning` is both:
  - A global preference.
  - A quick toggle action inside `Chat` and `Memory` commands.
- **F15.2** Toggling:
  - Immediately affects subsequent requests.
  - Does not require restart.

---

### 5.8 Tool visibility / management (Phase 3+)

**F16. Tool visibility (Phase 3)**

- **F16.1** When display of reasoning is enabled, show tool actions:
  - `archival_memory_insert`, `memory_insert`, `memory_replace`, `web_search`, `run_code`, etc.
- **F16.2** Format:
  - Human-readable summary: “Agent updated memory block `human`.”
  - Do not fully dump large payloads by default; allow expansion.

**F17. Tool management (Phase 4)**

- **F17.1** Future command “Manage Tools”:
  - List attached tools for active agent.
  - Toggle attach/detach via Letta `agents.tools.*` endpoints.
- **F17.2** Out of v1 scope; called out for later.

---

## 6. UX & Interaction Design

### 6.1 Global UX principles

- Keyboard-first.
- Minimal steps from prompt to answer.
- Separation of:
  - Main answer.
  - “Expert mode” info (reasoning, tools, memory).

### 6.2 Command UX outlines

**Chat with Letta Agent**

- Layout:
  - Header: active agent name and project.
  - Body (answer area): Markdown pane.
  - Footer: input field and actions.
- Actions:
  - Send / retry.
  - Toggle reasoning (on/off).
  - Copy answer.
  - Open `Agents` command.
- States:
  - No active agent → show call-to-action to select/create.
  - Loading → spinner + “Waiting for Letta…”.
  - Error → error banner + actions.

**Manage Letta Agents**

- Layout:
  - List of agents.
- Each item:
  - Title: agent name.
  - Subtitle: project name/slug.
  - Accessories: active indicator, model, tool count (if easily available).
- Actions:
  - Set as active.
  - Open chat.
  - Delete (Phase 2).
  - Open in browser (if Letta provides web URL).

**View Agent Memory Blocks**

- Layout:
  - List: memory block labels.
- Actions:
  - View details.
  - Copy block content.

**Create Agent**

- Layout:
  - Form with:
    - Name.
    - Template dropdown.
    - Description text area.
- Actions:
  - Submit and go to chat.
  - Submit and stay on agents list.

---

## 7. Data & State Model

### 7.1 Local state

Use `@raycast/utils` `useLocalStorage` for:

- `selectedAgentId: string | null`.
- `selectedAgentName: string | null` (for display).
- Optional:
  - `selectedProjectId: string | null`.
  - `userTimezone: string | null` (if we allow user override).

Use Raycast preferences for:

- `apiKey` (password).
- `baseUrl` (text).
- `showReasoning` (boolean).

No local conversation transcripts persisted beyond current view unless required by Raycast component semantics.

### 7.2 Remote state (Letta side)

- All agent memory, conversation context, tools, etc., live entirely in Letta.
- Extension never stores:
  - Raw Letta responses in disk state.
  - User API key in any unencrypted store.

---

## 8. API Integration

### 8.1 SDK choice

- Use official TypeScript SDK: `@letta-ai/letta-client` (assumed available in npm).
- Initialization:

  ```ts
  const client = new Letta({
    apiKey: prefs.apiKey,
    ...(prefs.baseUrl && { baseUrl: prefs.baseUrl }),
  });
  ```

### 8.2 Required operations

- Authentication check:
  - `client.agents.list()` or similar cheap call.
- Agents:
  - `client.agents.list({ projectId? })`.
  - `client.agents.retrieve(agentId)`.
  - `client.agents.create(...)`.
  - `client.agents.delete(agentId)` (if supported).
- Messaging:
  - `client.agents.messages.create(agentId, { input })` (non-stream) or
  - `client.agents.messages.stream(agentId, { messages, stream_tokens: true })` for streaming.
- Memory:
  - `client.agents.blocks.list(agentId)`.
  - `client.agents.blocks.retrieve(agentId, { label })`.

### 8.3 Event handling

Map Letta event types to internal types:

- `assistant_message` → `ChatAnswerChunk`.
- `reasoning_message` → `ReasoningChunk`.
- `tool_call_message` → `ToolUsageChunk`.
- `tool_return_message` → optional; may be ignored in v1.

Internal pipeline:

1. Submit user message to `messages.stream`.
2. Accumulate answer chunks into `answerText`.
3. Accumulate optional reasoning/tool chunks into `debugLog`.
4. On stream end:
   - Render `answerText` into primary markdown.
   - Render `debugLog` into secondary section if `showReasoning`.

---

## 9. Security & Privacy Requirements

- Store API keys only using Raycast’s encrypted preference storage.
- Never log API keys or full Letta responses to console in production builds.
- Do not send user content or Letta responses to any third-party services.
- If Raycast telemetry is used, scrub:
  - Queries and responses.
  - Any IDs that could be tied back to a person.

---

## 10. Performance & Reliability Requirements

- Extension must not block Raycast UI thread during network calls; always use async.
- Configure strict timeouts for Letta calls:
  - Connection + read timeout ≤ 60 seconds.
- Gracefully handle:
  - Letta downtime (show message, do not crash).
  - Invalid configuration (clear error states).
- Avoid excessive polling:
  - Only call Letta on explicit user actions.

---

## 11. Out of Scope (v1)

- Multi-account support.
- Telegram/Twilio-like proactive notifications (agent-initiated messages).
- Editing memory blocks from Raycast.
- Full tool management (attach/detach) in v1 (planned later).
- Voice input, audio transcription, image uploads.
- OAuth sign-in flows.

---

## 12. Risks & Open Questions

### 12.1 Risks

1. **Streaming complexity**  
   - Raycast UI might limit truly incremental streaming. Mitigation: start with buffered-mode.

2. **Letta API evolution**  
   - Event schemas may change; extension must be robust to unknown event types.

3. **User confusion about memory**  
   - Seeing too much reasoning/tool noise may overwhelm. Mitigation: default reasoning off, separate UI section.

### 12.2 Open questions

1. **Exact Letta TS SDK surface**  
   - Confirm streaming, blocks, and tools APIs in TypeScript match the Python SDK semantics.

2. **Project selection UX**  
   - Do we need explicit project switching in v1, or is “default project only” acceptable?

3. **Agent templates**  
   - Is there a Letta endpoint to create “Ion” by template name, or do we need to embed prompt/config in the extension?

4. **Answer length constraints**  
   - Any Raycast-specific limits on markdown size that require chunking or truncation?

---

## 13. Release Plan (Execution Outline)

**Phase 1 (Core Chat)**

1. Implement preferences (apiKey, baseUrl, showReasoning).
2. Implement `useLettaClient` hook.
3. Implement `Chat` command with:
   - Auth check.
   - Active agent requirement.
   - Simple non-stream or buffered streaming.
4. Implement `Agents` command (read-only list + “Set Active”).

**Phase 2 (Agent Management)**

1. `Create Agent` command with template support.
2. Agent delete action in `Agents` (if API supports).
3. Better project labelling in `Agents`.

**Phase 3 (Memory & Reasoning)**

1. `Memory` command with blocks list + detail view.
2. Event parsing pipeline for reasoning/tool events.
3. Reasoning section in chat UI, gated behind `showReasoning`.

This PRD defines the product and technical shape required to deliver a Raycast extension that mirrors the Telegram–Letta integration, adapted to a single-user desktop environment.
