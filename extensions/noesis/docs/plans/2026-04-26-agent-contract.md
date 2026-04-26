# Tryambakam Noesis Agent Contract Proposal

Date: 2026-04-26

## Purpose

This document defines the proposed backend and Raycast client contract for a new `agent` surface in Tryambakam Noesis.

Current state:

- The extension already supports engines, workflows, readings, profile defaults, and pulse snapshots.
- There is no existing `agent` resource in the manifest, TypeScript model, cache schema, API client, or UI.
- This document is therefore a forward contract proposal, not a description of live behavior.

The goal is to define a minimal but complete contract that can support:

- browsing available agents
- inspecting agent capabilities
- launching agent runs
- polling run progress in Raycast
- handling agents that pause for clarification or human input
- storing recent runs locally for fast Raycast-first rendering

## Product Position

Engines, workflows, and agents should remain distinct:

- `Engine`: one calculation unit with a single structured result
- `Workflow`: a synchronous composition of multiple engine executions with a synthesis payload
- `Agent`: a stateful, potentially multi-step operator that can think, act, pause, request input, and produce a run transcript plus final artifact

If the backend cannot support state, progress, and pause/resume semantics, it does not have an agent yet. It has another workflow variant.

## Design Constraints

The contract should work well in Raycast:

- first paint from cached local data
- polling over push/websocket as the primary delivery model
- explicit finite run states
- structured progress summaries for list rows and detail panes
- compact action surface for `Run`, `Resume`, `Cancel`, `Open Run`, and `Copy Run ID`

## Authentication

Use the existing authenticated model:

- header: `X-API-Key: <key>`
- content-type: `application/json`
- response format: JSON

The extension should not need a second auth model just for agents.

## Proposed Endpoints

### Catalog

#### `GET /api/v1/agents`

Returns the operator-visible agent catalog.

Response:

```json
{
  "agents": [
    {
      "id": "daily-mirror-agent",
      "name": "Daily Mirror Agent",
      "description": "Guides a daily witness session with follow-up prompts.",
      "status": "active",
      "category": "practice",
      "input_mode": "form",
      "supports_resume": true,
      "supports_cancel": true,
      "supports_history": true,
      "estimated_run_seconds": 20,
      "fetched_at": "2026-04-26T15:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/agents/{agent_id}`

Returns the richer configuration for one agent.

Response:

```json
{
  "id": "daily-mirror-agent",
  "name": "Daily Mirror Agent",
  "description": "Guides a daily witness session with follow-up prompts.",
  "status": "active",
  "category": "practice",
  "input_mode": "form",
  "supports_resume": true,
  "supports_cancel": true,
  "supports_history": true,
  "estimated_run_seconds": 20,
  "input_schema": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "birth_data": { "type": "object" },
      "options": { "type": "object" }
    },
    "required": ["question"]
  },
  "output_schema": {
    "type": "object"
  },
  "examples": [
    {
      "title": "Daily reflection",
      "input": {
        "question": "What is active in today's witness field?"
      }
    }
  ]
}
```

### Runs

#### `POST /api/v1/agents/{agent_id}/runs`

Starts a new run.

Request:

```json
{
  "input": {
    "question": "What is active in today's witness field?",
    "birth_data": {
      "date": "1991-08-13",
      "time": "13:31",
      "timezone": "Asia/Kolkata"
    },
    "options": {
      "mode": "daily"
    }
  },
  "client_context": {
    "surface": "raycast",
    "command": "agents",
    "extension_version": "1.0.0"
  }
}
```

Response:

```json
{
  "run_id": "arun_123",
  "agent_id": "daily-mirror-agent",
  "status": "queued",
  "title": "Daily reflection",
  "summary": "Queued for execution.",
  "created_at": "2026-04-26T15:05:00Z",
  "updated_at": "2026-04-26T15:05:00Z"
}
```

#### `GET /api/v1/agent-runs`

Returns recent runs across agents for history pages.

Query params:

- `limit`
- `offset`
- `agent_id` optional
- `status` optional

Response:

```json
{
  "runs": [
    {
      "run_id": "arun_123",
      "agent_id": "daily-mirror-agent",
      "agent_name": "Daily Mirror Agent",
      "status": "completed",
      "title": "Daily reflection",
      "summary": "Witness session completed.",
      "created_at": "2026-04-26T15:05:00Z",
      "updated_at": "2026-04-26T15:05:19Z"
    }
  ],
  "total": 1,
  "limit": 25,
  "offset": 0
}
```

#### `GET /api/v1/agent-runs/{run_id}`

Returns the current state of one run.

Response:

```json
{
  "run_id": "arun_123",
  "agent_id": "daily-mirror-agent",
  "agent_name": "Daily Mirror Agent",
  "status": "waiting_for_input",
  "title": "Daily reflection",
  "summary": "Waiting for clarification on emotional tone.",
  "progress": {
    "phase": "clarification",
    "step": 2,
    "total_steps": 4,
    "message": "Clarification needed before continuing."
  },
  "requested_input": {
    "kind": "text",
    "prompt": "Name the strongest feeling present right now.",
    "field": "emotional_tone"
  },
  "input": {
    "question": "What is active in today's witness field?"
  },
  "events": [
    {
      "id": "evt_1",
      "timestamp": "2026-04-26T15:05:02Z",
      "kind": "status",
      "message": "Run started."
    },
    {
      "id": "evt_2",
      "timestamp": "2026-04-26T15:05:11Z",
      "kind": "prompt",
      "message": "Clarification requested."
    }
  ],
  "result": null,
  "error": null,
  "created_at": "2026-04-26T15:05:00Z",
  "updated_at": "2026-04-26T15:05:11Z"
}
```

#### `POST /api/v1/agent-runs/{run_id}/input`

Supplies requested follow-up input for a paused run.

Request:

```json
{
  "input": {
    "emotional_tone": "restless but clear"
  }
}
```

Response:

```json
{
  "run_id": "arun_123",
  "status": "running",
  "summary": "Clarification received. Continuing run.",
  "updated_at": "2026-04-26T15:05:20Z"
}
```

#### `POST /api/v1/agent-runs/{run_id}/cancel`

Cancels a queued or running run.

Response:

```json
{
  "run_id": "arun_123",
  "status": "cancelled",
  "summary": "Run cancelled by user.",
  "updated_at": "2026-04-26T15:05:25Z"
}
```

## Run State Contract

Allowed run statuses:

- `queued`
- `running`
- `waiting_for_input`
- `completed`
- `failed`
- `cancelled`

State rules:

- `queued` -> `running|cancelled|failed`
- `running` -> `waiting_for_input|completed|failed|cancelled`
- `waiting_for_input` -> `running|failed|cancelled`
- terminal: `completed|failed|cancelled`

Anything outside these states will make the Raycast UI ambiguous and should be rejected.

## Result Contract

When a run completes, `result` should be present and structured:

```json
{
  "result": {
    "summary": "The witness field is clear but heat is moving upward.",
    "artifact_type": "reading",
    "artifact": {
      "markdown": "# Reading\n\nThe witness field is clear...",
      "structured": {
        "theme": "clarity with activation",
        "guidance": [
          "Slow the breath before speech.",
          "Name the impulse before acting."
        ]
      }
    }
  }
}
```

Minimum result expectations:

- one compact summary string for list rows
- one detailed artifact the Raycast detail view can render
- one structured object for copy/export/debug use

## Error Contract

When a run fails:

```json
{
  "error": {
    "code": "input_validation_error",
    "message": "Question is required.",
    "retryable": false,
    "details": {
      "field": "question"
    }
  }
}
```

Required fields:

- `code`
- `message`
- `retryable`

This keeps the current Raycast failure-detail pattern usable.

## Suggested TypeScript Model

These are the first client-side types the extension would need:

```ts
export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "deprecated";
  category?: string;
  inputMode: "form" | "chat";
  supportsResume: boolean;
  supportsCancel: boolean;
  supportsHistory: boolean;
  estimatedRunSeconds?: number;
  fetchedAt?: string;
}

export interface AgentDetail extends AgentSummary {
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  examples: Array<{
    title: string;
    input: Record<string, unknown>;
  }>;
}

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_for_input"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentRunSummary {
  runId: string;
  agentId: string;
  agentName: string;
  status: AgentRunStatus;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunDetail extends AgentRunSummary {
  progress?: {
    phase?: string;
    step?: number;
    totalSteps?: number;
    message?: string;
  };
  requestedInput?: {
    kind: "text" | "choice" | "object";
    prompt: string;
    field: string;
  };
  input?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  } | null;
  events: Array<{
    id: string;
    timestamp: string;
    kind: string;
    message: string;
  }>;
}
```

## Suggested Cache Additions

The local SQLite cache would need at least:

### `agents`

- `agent_id`
- `name`
- `description`
- `status`
- `category`
- `input_mode`
- `supports_resume`
- `supports_cancel`
- `supports_history`
- `estimated_run_seconds`
- `detail_json`
- `fetched_at`

### `agent_runs`

- `run_id`
- `agent_id`
- `agent_name`
- `status`
- `title`
- `summary`
- `progress_json`
- `requested_input_json`
- `input_json`
- `result_json`
- `error_json`
- `events_json`
- `created_at`
- `updated_at`
- `fetched_at`

## Raycast Command Plan

### New commands

- `Agents`
- `Agent Runs`

### Dashboard integration

Add one `Launchpad` row:

- `Agent Console`

Add one `Command Center` or `Recent Activity` row:

- `Recent Agent Runs`

### Actions

For agent rows:

- `Run Agent`
- `View Agent`
- `Open Agent Runs`
- `Copy Agent ID`

For run rows:

- `Open Run`
- `Resume Run` when `waiting_for_input`
- `Cancel Run` when `queued|running|waiting_for_input`
- `Run Again`
- `Copy Run ID`

## Raycast UX Rules

- The list view should never depend on long-polling. Load cached runs first, then revalidate.
- While a run is `running`, the detail pane should show structured progress, not a spinner alone.
- While a run is `waiting_for_input`, the detail pane should make the requested prompt obvious and the primary action should be `Resume Run`.
- Completed runs should render through the same interpreted-presenter philosophy already used for engines/workflows/readings.

## API Client Additions

The extension would need client methods equivalent to:

- `getAgents()`
- `getAgent(agentId)`
- `createAgentRun(agentId, input)`
- `getAgentRuns({ limit, offset, agentId, status })`
- `getAgentRun(runId)`
- `submitAgentRunInput(runId, input)`
- `cancelAgentRun(runId)`

These should follow the existing `SelemeneApiClient` conventions and error mapping.

## Minimum Viable Delivery Order

1. Backend: expose catalog and run endpoints with the finite status model above.
2. Client types: add `AgentSummary`, `AgentDetail`, `AgentRunSummary`, `AgentRunDetail`.
3. Cache/query layer: persist agents and recent runs locally.
4. Manifest/navigation: add `Agents` and `Agent Runs`.
5. UI: list/detail browse flows plus run detail and resume/cancel actions.
6. Presenter: render completed agent outputs as readable reports, not raw JSON dumps.

## Non-Goals

This first contract should not require:

- websocket streaming
- arbitrary tool-call replay in Raycast
- nested subagent trees
- background autonomous runs without explicit user initiation

If those are needed later, they should be added after the basic catalog/run/history model is stable.
