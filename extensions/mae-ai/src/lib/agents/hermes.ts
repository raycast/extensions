import { randomUUID } from "node:crypto";
import { agentFetch, agentJson, delay, readAgentEvents } from "./http";
import {
  AgentAdapter,
  AgentApproval,
  AgentConfig,
  AgentEmit,
  AgentSession,
  AgentState,
  historyMessages,
  record,
  string,
  terminal,
} from "./types";

export function hermesState(value: unknown): AgentState {
  if (
    ["completed", "failed", "cancelled", "stopping", "unknown"].includes(
      string(value),
    )
  ) {
    return value as AgentState;
  }
  return value === "interrupted" ? "failed" : "running";
}

export function hermesApprovals(
  value: unknown,
  generation: unknown,
): AgentApproval[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const control = record(item);
    const currentGeneration = control.execution_generation ?? generation;
    if (
      control.kind !== "approval" ||
      !string(control.prompt_id) ||
      !Number.isInteger(currentGeneration)
    )
      return [];
    return [
      {
        id: string(control.prompt_id),
        kind: "approval",
        generation: currentGeneration as number,
        title: string(control.title) || "Hermes Tool Approval",
        detail:
          [
            string(control.command),
            string(control.description),
            string(control.question),
          ]
            .filter(Boolean)
            .join("\n\n") ||
          "Review this request on the Hermes server if details are unavailable.",
        allow:
          !Array.isArray(control.choices) || control.choices.includes("once"),
      },
    ];
  });
}

export class HermesAdapter implements AgentAdapter {
  private features: Record<string, unknown> = {};

  constructor(private readonly config: AgentConfig) {}

  private json(path: string, init?: RequestInit) {
    return agentJson(`${this.config.url}${path}`, this.config.secret, init);
  }

  async targets(signal: AbortSignal) {
    const capabilities = record(
      await this.json("/v1/capabilities", { signal }),
    );
    this.features = record(capabilities.features);
    for (const name of [
      "run_submission",
      "run_status",
      "run_events_sse",
      "run_stop",
    ]) {
      if (!this.features[name])
        throw new Error(
          `This Hermes server does not advertise ${name}. Upgrade/enable its API server.`,
        );
    }
    const models = record(await this.json("/v1/models", { signal }));
    const targets = (Array.isArray(models.data) ? models.data : []).flatMap(
      (item) => {
        const id = string(record(item).id);
        return id ? [{ id, title: id }] : [];
      },
    );
    if (!targets.length)
      throw new Error("Hermes did not advertise an agent profile.");
    return targets;
  }

  async create(target: string): Promise<AgentSession> {
    const id = `pocket-ai-${randomUUID()}`;
    const response = record(
      await this.json("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ id }),
      }),
    );
    return {
      id: string(response.id) || string(response.session_id) || id,
      target,
    };
  }

  async restore(session: AgentSession, emit: AgentEmit) {
    const history = record(
      await this.json(
        `/api/sessions/${encodeURIComponent(session.id)}/messages?inline_images=false&order=latest&limit=100`,
      ),
    );
    const restored = {
      ...session,
      id: string(history.session_id) || session.id,
    };
    emit({ type: "history", messages: historyMessages(history.data) });
    if (session.pendingSubmission && !session.runId) {
      emit({
        type: "state",
        state: "unknown",
        error:
          "The last submission was not acknowledged. Check this session on Hermes before starting a new conversation; Pocket AI will not replay it.",
      });
    } else if (!session.runId) {
      emit({ type: "state", state: "idle" });
    }
    return restored;
  }

  async send(
    session: AgentSession,
    query: string,
    instructions: string,
    submissionId: string,
  ) {
    const response = record(
      await this.json("/v1/runs", {
        method: "POST",
        headers: { "Idempotency-Key": submissionId },
        // The advertised profile is not an underlying LLM ID. Keep the server's model configuration.
        body: JSON.stringify({
          input: query,
          instructions,
          session_id: session.id,
        }),
      }),
    );
    const runId = string(response.run_id);
    if (!runId)
      throw new Error(
        "Hermes did not acknowledge a run ID. Check the server before retrying.",
      );
    return { ...session, runId, pendingSubmission: undefined };
  }

  private async status(
    session: AgentSession,
    emit: AgentEmit,
  ): Promise<AgentState> {
    const response = record(
      await this.json(`/v1/runs/${encodeURIComponent(session.runId!)}`),
    );
    const state = hermesState(response.status);
    const sessionId = string(response.session_id);
    if (sessionId && sessionId !== session.id) {
      session.id = sessionId;
      emit({ type: "session", session: { ...session } });
    }
    if (
      terminal(state) &&
      typeof response.output === "string" &&
      response.output
    ) {
      emit({ type: "text", text: response.output });
    }
    const approvals = this.features.run_approval
      ? hermesApprovals(
          response.pending_controls,
          response.execution_generation,
        )
      : [];
    emit({ type: "approvals", approvals });
    emit({
      type: "state",
      state,
      error:
        state === "unknown"
          ? "Hermes cannot confirm the previous execution. Resolve this run on the server; do not resend it."
          : state === "failed"
            ? string(response.error) ||
              "The remote run failed or was interrupted."
            : undefined,
    });
    if (
      Array.isArray(response.pending_controls) &&
      response.pending_controls.some((item) => record(item).kind === "clarify")
    ) {
      emit({
        type: "progress",
        text: "Hermes needs clarification. Answer in its own dashboard, then reconnect here.",
      });
    }
    return state;
  }

  async watch(session: AgentSession, emit: AgentEmit, signal: AbortSignal) {
    if (!session.runId) return;
    let lastSeq = -1;
    let answer = "";
    let failures = 0;
    let observed: AgentState = "running";
    let streamController: AbortController | undefined;
    const settled = () => terminal(observed) || observed === "unknown";
    const receive: AgentEmit = (event) => {
      if (settled()) return;
      if (event.type === "state") observed = event.state;
      emit(event);
      if (settled()) streamController?.abort();
    };
    while (!signal.aborted) {
      try {
        let state = await this.status(session, receive);
        if (terminal(state) || state === "unknown") return;
        streamController = new AbortController();
        const streamSignal = AbortSignal.any([signal, streamController.signal]);
        const response = await agentFetch(
          `${this.config.url}/v1/runs/${encodeURIComponent(session.runId)}/events`,
          this.config.secret,
          {
            signal: streamSignal,
            headers: lastSeq >= 0 ? { "Last-Event-ID": String(lastSeq) } : {},
          },
        );
        if (!response.body)
          throw new Error("Hermes returned an empty event stream.");
        const poller = setInterval(() => {
          void this.status(session, receive).catch(() => undefined);
        }, 3000);
        try {
          await readAgentEvents(
            response.body,
            ({ data, event, id }) => {
              const payload = record(data);
              if (payload.run_id && payload.run_id !== session.runId) return;
              const seq = Number(id ?? payload.seq);
              if (Number.isInteger(seq)) {
                if (seq <= lastSeq) return;
                lastSeq = seq;
              }
              const name = string(payload.event) || event || "";
              if (name === "replay.truncated") {
                throw new Error(
                  "Hermes no longer retains the complete token stream. Reconnect to load authoritative session history.",
                );
              }
              if (name === "message.delta") {
                answer += string(payload.delta);
                receive({ type: "text", text: answer });
              } else if (name === "message.interim") {
                receive({ type: "progress", text: string(payload.text) });
              } else if (
                name.startsWith("tool.") ||
                name.startsWith("subagent.")
              ) {
                receive({
                  type: "progress",
                  text: `${name}: ${string(payload.tool) || string(payload.summary) || string(payload.goal)}`,
                });
              } else if (name === "approval.request") {
                void this.status(session, receive).catch(() => undefined);
              } else if (name.startsWith("run.")) {
                state = hermesState(name.slice(4));
                if (terminal(state)) {
                  if (typeof payload.output === "string")
                    receive({ type: "text", text: payload.output });
                  receive({
                    type: "state",
                    state,
                    error:
                      state === "failed"
                        ? string(payload.error) || "Remote run interrupted."
                        : undefined,
                  });
                }
              }
            },
            streamSignal,
          );
        } finally {
          clearInterval(poller);
        }
        state = await this.status(session, receive);
        if (terminal(state) || state === "unknown") return;
        failures = 0;
      } catch (error) {
        if (signal.aborted || settled()) return;
        if (
          ++failures >= 5 ||
          (error instanceof Error &&
            error.message.includes("no longer retains"))
        )
          throw error;
      }
      emit({
        type: "progress",
        text: "Reconnecting to the same Hermes run; the request is not resubmitted...",
      });
      await delay(Math.min(500 * 2 ** failures, 8000), signal);
    }
  }

  async stop(session: AgentSession) {
    if (!session.runId)
      throw new Error("No acknowledged run is available to stop.");
    await this.json(`/v1/runs/${encodeURIComponent(session.runId)}/stop`, {
      method: "POST",
      body: "{}",
    });
  }

  async approve(
    session: AgentSession,
    approval: AgentApproval,
    allow: boolean,
  ) {
    if (!session.runId || !Number.isInteger(approval.generation))
      throw new Error("Approval identity is unavailable. Reconnect first.");
    if (allow && !approval.allow)
      throw new Error("This request only allows denial.");
    await this.json(`/v1/runs/${encodeURIComponent(session.runId)}/approval`, {
      method: "POST",
      body: JSON.stringify({
        request_id: approval.id,
        execution_generation: approval.generation,
        choice: allow ? "once" : "deny",
      }),
    });
  }

  async close() {}
}
