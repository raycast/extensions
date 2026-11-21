import { randomUUID } from "node:crypto";
import { GatewayClient, GatewayClientHostDeps } from "@openclaw/gateway-client";
import {
  GATEWAY_CLIENT_CAPS,
  GATEWAY_CLIENT_IDS,
  GATEWAY_CLIENT_MODES,
} from "@openclaw/gateway-protocol/client-info";
import { delay } from "./http";
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
  visibleText,
} from "./types";

export function openClawApproval(value: unknown): AgentApproval | undefined {
  const approval = record(value);
  const presentation = record(approval.presentation);
  const id = string(approval.id);
  const kind = string(presentation.kind);
  if (
    !id ||
    approval.status !== "pending" ||
    !["exec", "plugin", "system-agent"].includes(kind)
  )
    return undefined;
  return {
    id,
    kind,
    title: string(presentation.title) || "OpenClaw Tool Approval",
    detail: [
      presentation.commandText,
      presentation.description,
      presentation.detail,
      presentation.warningText,
    ]
      .filter((item) => typeof item === "string" && item)
      .join("\n\n"),
    expiresAt:
      typeof approval.expiresAtMs === "number"
        ? approval.expiresAtMs
        : undefined,
    allow:
      Array.isArray(presentation.allowedDecisions) &&
      presentation.allowedDecisions.includes("allow-once"),
  };
}

export class OpenClawAdapter implements AgentAdapter {
  private readonly client: GatewayClient;
  private connected = false;
  private closed = false;
  private connectError?: Error;
  private needsSync = false;
  private watchSession?: AgentSession;
  private emit?: AgentEmit;
  private state: AgentState = "idle";
  private answer = "";
  private sequences = new Map<string, number>();
  private approvals = new Map<string, AgentApproval>();
  private syncing = false;
  private bufferedEvents: Array<{ event: string; payload?: unknown }> = [];
  private methods = new Set<string>();

  constructor(
    config: AgentConfig,
    hostDeps: GatewayClientHostDeps,
    private readonly flush: () => Promise<void> = async () => undefined,
  ) {
    this.client = new GatewayClient({
      url: config.url,
      token: config.secret,
      clientName: GATEWAY_CLIENT_IDS.WEBCHAT,
      clientDisplayName: "Pocket AI",
      clientVersion: "1.1.0",
      platform: process.platform,
      mode: GATEWAY_CLIENT_MODES.UI,
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      caps: [
        GATEWAY_CLIENT_CAPS.TOOL_EVENTS,
        GATEWAY_CLIENT_CAPS.SESSION_SCOPED_EVENTS,
        GATEWAY_CLIENT_CAPS.APPROVALS,
        GATEWAY_CLIENT_CAPS.EXEC_APPROVALS,
        GATEWAY_CLIENT_CAPS.PLUGIN_APPROVALS,
      ],
      minProtocol: 4,
      maxProtocol: 4,
      requestTimeoutMs: 20_000,
      hostDeps,
      onHelloOk: (hello) => {
        this.connected = true;
        this.connectError = undefined;
        this.methods = new Set(hello.features.methods);
        this.needsSync = true;
      },
      onClose: () => {
        this.connected = false;
        this.emit?.({
          type: "progress",
          text: "OpenClaw disconnected. Reconnecting without resubmitting the request...",
        });
      },
      onConnectError: (error) => {
        this.connectError = error;
      },
      onReconnectPaused: (info) => {
        this.connectError = new Error(
          `OpenClaw connection paused: ${info.detailCode || info.reason}. Review device pairing/permissions on the server, then reconnect.`,
        );
      },
      onGap: () => {
        this.needsSync = true;
      },
      onEvent: (event) => {
        if (this.syncing) {
          if (this.bufferedEvents.length < 500) this.bufferedEvents.push(event);
          else this.needsSync = true;
        } else this.event(event);
      },
    });
    this.client.start();
  }

  private async ready(signal?: AbortSignal) {
    const deadline = Date.now() + 30_000;
    while (!this.connected) {
      if (this.closed) throw new Error("OpenClaw connection closed.");
      if (this.connectError) throw this.connectError;
      if (Date.now() > deadline)
        throw new Error(
          "OpenClaw connection timed out. Check the gateway URL and device pairing.",
        );
      await delay(50, signal || new AbortController().signal);
    }
    signal?.throwIfAborted();
  }

  async targets(signal: AbortSignal) {
    await this.ready(signal);
    const response = await this.client.request<{
      agents: Array<{ id: string; name?: string }>;
    }>("agents.list", {});
    if (!Array.isArray(response.agents) || !response.agents.length)
      throw new Error("OpenClaw did not advertise any accessible agents.");
    return response.agents.map((agent) => ({
      id: agent.id,
      title: agent.name || agent.id,
    }));
  }

  async create(target: string): Promise<AgentSession> {
    await this.ready();
    const id = `agent:${target}:pocket-ai:${randomUUID()}`;
    const response = await this.client.request<{
      key: string;
      sessionId?: string;
    }>("sessions.create", {
      key: id,
      agentId: target,
      idempotencyKey: randomUUID(),
    });
    if (!response.key)
      throw new Error("OpenClaw did not return a session key.");
    return { id: response.key, target, sessionId: response.sessionId };
  }

  private setState(state: AgentState, error?: string) {
    this.state = state;
    this.emit?.({ type: "state", state, error });
  }

  private async sync(session: AgentSession, emit: AgentEmit) {
    await this.ready();
    this.syncing = true;
    this.needsSync = false;
    try {
      await this.client.request("sessions.subscribe", {});
      const subscription = record(
        await this.client.request("sessions.messages.subscribe", {
          key: session.id,
          agentId: session.target,
          includeApprovals: true,
        }),
      );
      const history = record(
        await this.client.request("chat.history", {
          sessionKey: session.id,
          agentId: session.target,
          limit: 100,
        }),
      );
      const physicalId =
        string(history.sessionId) ||
        string(record(history.sessionInfo).sessionId);
      if (session.sessionId && physicalId && physicalId !== session.sessionId) {
        throw new Error(
          "The remote session was replaced. Start a new Pocket AI conversation instead of writing to its replacement.",
        );
      }
      if (physicalId) session.sessionId = physicalId;
      const messages = historyMessages(history.messages);
      emit({ type: "history", messages });
      const inFlight = record(history.inFlightRun);
      const runId = string(inFlight.runId);
      if (runId) {
        session.runId = runId;
        session.pendingSubmission = undefined;
        this.answer = string(inFlight.text);
        if (this.answer) emit({ type: "text", text: this.answer });
        this.setState("running");
      } else {
        const unconfirmed = Boolean(
          session.pendingSubmission ||
          (session.runId && messages.at(-1)?.role === "user"),
        );
        const last = record(
          Array.isArray(history.messages) ? history.messages.at(-1) : undefined,
        );
        const stopReason = string(last.stopReason);
        this.setState(
          unconfirmed
            ? "unknown"
            : stopReason === "error"
              ? "failed"
              : stopReason === "aborted"
                ? "cancelled"
                : "idle",
          unconfirmed
            ? "Submission outcome is unconfirmed. Inspect the remote session; Pocket AI will not send it again automatically."
            : string(last.errorMessage) || undefined,
        );
      }
      emit({ type: "session", session: { ...session } });
      this.approvals.clear();
      const replay = record(subscription.approvalReplay);
      if (Array.isArray(replay.approvals)) {
        for (const item of replay.approvals) {
          const approval = openClawApproval(item);
          if (approval) this.approvals.set(approval.id, approval);
        }
      }
      this.publishApprovals();
    } finally {
      this.syncing = false;
      const buffered = this.bufferedEvents.splice(0);
      for (const event of buffered) this.event(event);
    }
  }

  async restore(session: AgentSession, emit: AgentEmit) {
    this.watchSession = session;
    this.emit = emit;
    await this.sync(session, emit);
    return session;
  }

  async send(
    session: AgentSession,
    query: string,
    instructions: string,
    submissionId: string,
  ) {
    await this.ready();
    const response = await this.client.request<{ runId: string }>("chat.send", {
      sessionKey: session.id,
      sessionId: session.sessionId,
      agentId: session.target,
      message: instructions.trim()
        ? `[Pocket AI response instructions]\n${instructions}\n\n[User message]\n${query}`
        : query,
      idempotencyKey: submissionId,
      deliver: false,
    });
    if (!response.runId)
      throw new Error(
        "OpenClaw did not acknowledge a run ID. Reconnect before sending anything else.",
      );
    this.answer = "";
    this.state = "running";
    return { ...session, runId: response.runId, pendingSubmission: undefined };
  }

  private publishApprovals() {
    this.emit?.({ type: "approvals", approvals: [...this.approvals.values()] });
  }

  private event(event: { event: string; payload?: unknown }) {
    const session = this.watchSession;
    if (!session || !this.emit) return;
    const payload = record(event.payload);
    if (event.event === "session.approval") {
      if (payload.sessionKey !== session.id) return;
      const approval = record(payload.approval);
      if (payload.phase === "terminal")
        this.approvals.delete(string(approval.id));
      else {
        const pending = openClawApproval(approval);
        if (pending) this.approvals.set(pending.id, pending);
      }
      this.publishApprovals();
      return;
    }
    if (!session.runId || payload.runId !== session.runId) return;
    if (payload.sessionKey && payload.sessionKey !== session.id) return;
    const key = `${event.event}:${session.runId}`;
    if (typeof payload.seq === "number") {
      const previous = this.sequences.get(key);
      if (previous !== undefined && payload.seq <= previous) return;
      if (
        event.event === "agent" &&
        previous !== undefined &&
        payload.seq > previous + 1
      )
        this.needsSync = true;
      this.sequences.set(key, payload.seq);
      if (this.sequences.size > 64)
        this.sequences.delete(this.sequences.keys().next().value!);
    }
    if (event.event === "agent" && payload.stream === "tool") {
      const data = record(payload.data);
      this.emit({
        type: "progress",
        text: `${string(data.phase) || "tool"}: ${string(data.name) || string(data.toolName) || "remote tool"}`,
      });
    }
    if (event.event !== "chat") return;
    const state = string(payload.state);
    if (state === "delta") {
      const snapshot = visibleText(payload.message);
      if (snapshot) {
        this.answer = snapshot;
      } else if (typeof payload.deltaText === "string") {
        this.answer = payload.replace
          ? payload.deltaText
          : this.answer + payload.deltaText;
      } else {
        this.answer = visibleText(payload.message);
      }
      this.emit({ type: "text", text: this.answer });
    } else if (state === "status") {
      this.emit({
        type: "progress",
        text: string(payload.phase).replaceAll("_", " "),
      });
    } else if (["final", "aborted", "error"].includes(state)) {
      const text = visibleText(payload.message);
      if (text) this.emit({ type: "text", text });
      this.setState(
        state === "final"
          ? "completed"
          : state === "aborted"
            ? "cancelled"
            : "failed",
        string(payload.errorMessage) || undefined,
      );
      this.approvals.clear();
      this.publishApprovals();
    }
  }

  async watch(session: AgentSession, emit: AgentEmit, signal: AbortSignal) {
    this.watchSession = session;
    this.emit = emit;
    this.needsSync = true;
    let lastSync = 0;
    while (!signal.aborted) {
      if (!this.connected || this.needsSync || Date.now() - lastSync > 15_000) {
        await this.ready(signal);
        await this.sync(session, emit);
        lastSync = Date.now();
      }
      if (terminal(this.state) || this.state === "unknown") return;
      await delay(250, signal);
    }
  }

  async stop(session: AgentSession) {
    await this.ready();
    if (!session.runId)
      throw new Error("No acknowledged run is available to stop.");
    await this.client.request("chat.abort", {
      sessionKey: session.id,
      agentId: session.target,
      runId: session.runId,
    });
  }

  async approve(
    session: AgentSession,
    approval: AgentApproval,
    allow: boolean,
  ) {
    await this.ready();
    if (
      this.watchSession?.id !== session.id ||
      !this.approvals.has(approval.id)
    )
      throw new Error("This approval is no longer pending. Reconnect first.");
    if (approval.expiresAt && approval.expiresAt <= Date.now())
      throw new Error("This approval expired.");
    if (allow && !approval.allow)
      throw new Error("This request does not allow one-time approval.");
    if (!this.methods.has("approval.resolve"))
      throw new Error(
        "Upgrade OpenClaw for session-scoped approval resolution.",
      );
    await this.client.request("approval.resolve", {
      id: approval.id,
      kind: approval.kind,
      decision: allow ? "allow-once" : "deny",
    });
    this.approvals.delete(approval.id);
    this.publishApprovals();
  }

  async close() {
    this.closed = true;
    this.emit = undefined;
    await this.client.stopAndWait({ timeoutMs: 1500 });
    await this.flush();
  }
}
