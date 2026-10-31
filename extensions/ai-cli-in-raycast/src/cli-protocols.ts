import type { CodexModel } from "./codex";

export type CliProviderId = "qoder" | "qoder-cn" | "workbuddy" | "gemini";

export type CliStep = {
  sessionId?: string;
  itemId?: string;
  delta?: string;
  text?: string;
  result?: "completed" | "failed";
  error?: string;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Native argv only. No shell interpolation, latest-session fallback, or approvals. */
export function buildCliArgs(
  provider: CliProviderId,
  options: {
    prompt: string;
    model: string;
    effort?: string;
    remoteId?: string;
  },
): string[] {
  if (options.effort) {
    if (provider !== "workbuddy")
      throw new Error(
        "This CLI does not publish verified per-model reasoning choices.",
      );
    if (!WORKBUDDY_EFFORTS.includes(options.effort))
      throw new Error("Invalid WorkBuddy reasoning effort.");
  }
  if (
    options.remoteId !== undefined &&
    !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,255}$/.test(options.remoteId)
  )
    throw new Error("Invalid saved CLI session ID. Start a new session.");
  if (provider === "gemini") {
    if (
      options.remoteId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        options.remoteId,
      )
    )
      throw new Error(
        "Gemini requires an exact session UUID. Start a new session.",
      );
    return [
      "--output-format",
      "stream-json",
      "--approval-mode",
      "default",
      "--extensions",
      "none",
      ...(options.model && options.model !== "__cli_default__"
        ? ["--model", options.model]
        : []),
      ...(options.remoteId ? ["--resume", options.remoteId] : []),
      `--prompt=${options.prompt}`,
    ];
  }
  return [
    "--tools",
    "",
    "--permission-mode",
    provider === "workbuddy" ? "dontAsk" : "dont_ask",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--setting-sources",
    "",
    "--settings",
    '{"disableAllHooks":true}',
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    ...(options.model && options.model !== "__cli_default__"
      ? ["--model", options.model]
      : []),
    ...(options.effort ? ["--effort", options.effort] : []),
    ...(options.remoteId ? ["--resume", options.remoteId] : []),
    "--print",
    "--",
    options.prompt,
  ];
}

/** Qoder 1.1.74 and WorkBuddy's bundled CodeBuddy use the same event envelope. */
export function parseCliEvent(
  provider: CliProviderId,
  value: unknown,
): CliStep {
  const data = record(value);
  // Subagent messages are not the user's conversation and cannot change its ID.
  if (data.parent_tool_use_id) return {};
  const sessionId =
    typeof data.session_id === "string" ? data.session_id : undefined;
  const session = sessionId ? { sessionId } : {};
  if (provider === "gemini") {
    if (data.type === "init") return session;
    if (
      data.type === "message" &&
      data.role === "assistant" &&
      typeof data.content === "string"
    )
      return data.delta === true
        ? { ...session, delta: data.content }
        : { ...session, text: data.content };
    if (data.type === "result")
      return data.status === "success" && !data.error
        ? { ...session, result: "completed" }
        : {
            ...session,
            result: "failed",
            error:
              "Gemini could not complete the response. Check sign-in, model access, or tool approval in your terminal.",
          };
    if (data.type === "error" && data.severity === "error")
      return {
        ...session,
        result: "failed",
        error:
          "Gemini needs attention. Open it in your terminal to check sign-in and model access.",
      };
    return {};
  }
  if (data.type === "system" && data.subtype === "init") return session;
  if (data.type === "stream_event") {
    const event = record(data.event);
    const delta = record(event.delta);
    if (
      event.type === "content_block_delta" &&
      delta.type === "text_delta" &&
      typeof delta.text === "string"
    )
      return { ...session, delta: delta.text };
    return {};
  }
  if (data.type === "assistant") {
    const message = record(data.message);
    const content = Array.isArray(message.content) ? message.content : [];
    const text = content
      .map(record)
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    return text
      ? {
          ...session,
          ...(typeof message.id === "string" ? { itemId: message.id } : {}),
          text,
        }
      : {};
  }
  if (data.type === "result") {
    const denied =
      Array.isArray(data.permission_denials) &&
      data.permission_denials.length > 0;
    const success =
      data.subtype === "success" && data.is_error === false && !denied;
    return {
      ...session,
      result: success ? "completed" : "failed",
      ...(success && typeof data.result === "string"
        ? { text: data.result }
        : {}),
      ...(!success
        ? {
            error: denied
              ? "This request needs tools or interactive approval. Continue in the CLI."
              : "The CLI could not complete the response. Open it in your terminal to check sign-in and model access.",
          }
        : {}),
    };
  }
  if (data.type === "control_request" || data.type === "error")
    return {
      ...session,
      result: "failed",
      error:
        "The CLI needs attention. Continue in your terminal to handle sign-in or approval.",
    };
  return {};
}

const modelEntry = (model: string, displayName = model): CodexModel => ({
  model,
  displayName,
  efforts: [],
  defaultEffort: "",
});

// CodeBuddy 2.161.0 advertises these global input values. They are only
// selectable when the chosen installed product model explicitly lists them.
const WORKBUDDY_EFFORTS = ["minimal", "low", "medium", "high", "xhigh", "max"];

/** Static product metadata only; never infer effort support from a model name. */
export function parseWorkbuddyModelMetadata(value: unknown): CodexModel[] {
  const entries = record(value).models;
  if (!Array.isArray(entries)) return [];
  const models = new Map<string, CodexModel>();
  for (const value of entries) {
    const entry = record(value);
    if (typeof entry.id !== "string" || !/^[\w./:-]+$/.test(entry.id)) continue;
    // The product also lists image/video generators, which are not chat models.
    if (entry.supportsToolCall !== true && entry.supportsReasoning !== true)
      continue;
    const reasoning = record(entry.reasoning);
    const efforts = Array.isArray(reasoning.supportedEfforts)
      ? [
          ...new Set(
            reasoning.supportedEfforts.filter(
              (value): value is string =>
                typeof value === "string" && WORKBUDDY_EFFORTS.includes(value),
            ),
          ),
        ]
      : [];
    const preferred =
      typeof reasoning.defaultEffort === "string"
        ? reasoning.defaultEffort
        : typeof reasoning.effort === "string"
          ? reasoning.effort
          : "";
    models.set(entry.id, {
      ...modelEntry(
        entry.id,
        typeof entry.name === "string" && entry.name.trim()
          ? entry.name
          : entry.id,
      ),
      efforts,
      defaultEffort: efforts.includes(preferred) ? preferred : "",
    });
  }
  return [...models.values()];
}

/** Only consume model identifiers/labels, never provider settings or credentials. */
export function parseCliModels(
  provider: CliProviderId,
  output: string,
): CodexModel[] {
  const models = new Map<string, CodexModel>();
  const add = (id: unknown, name?: unknown) => {
    if (typeof id !== "string" || !/^[\w./:-]+$/.test(id)) return;
    models.set(
      id,
      modelEntry(
        id,
        typeof name === "string" && name.trim() ? name.trim() : id,
      ),
    );
  };
  if (provider === "workbuddy") {
    // The installed CLI's --help advertises the active product's supported IDs.
    const listed = /Currently supported:\s*\(([^)]+)\)/.exec(output);
    if (listed) for (const id of listed[1].split(",")) add(id.trim());
    else {
      try {
        const value: unknown = JSON.parse(output);
        const entries = Array.isArray(value) ? value : record(value).models;
        if (Array.isArray(entries))
          for (const value of entries) {
            const entry = record(value);
            add(entry.id, entry.name);
          }
      } catch {
        /* No advertised catalog; the caller can offer the CLI's default. */
      }
    }
  } else {
    // --list-models emits a MODEL header and one current-user model per line.
    let started = false;
    for (const line of output.split(/\r?\n/)) {
      const id = line.trim();
      if (id === "MODEL") {
        started = true;
        continue;
      }
      if (started) add(id);
    }
  }
  return [...models.values()];
}
