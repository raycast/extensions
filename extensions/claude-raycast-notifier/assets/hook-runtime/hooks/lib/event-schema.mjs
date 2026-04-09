const DEFAULT_SEVERITY = {
  running: "info",
  needs_input: "warning",
  success: "info",
  failure: "error",
  done: "info",
};

const DEFAULT_RETURN_URLS = {
  claude: null,
  gemini: null,
  copilot: null,
};

const ATTENTION_TYPES = new Set(["needs_input", "done"]);

export function normalizeEvent(raw = {}, env = process.env) {
  const source = detectSource(raw, env);
  const hookEventName = deriveHookEventName(raw, env);
  const type = raw.type ?? env.CLAUDE_HOOK_EVENT_TYPE ?? inferType(raw, env);
  const title = raw.title ?? defaultTitle(source, type);
  const message = raw.message ?? raw.summary ?? "AI event received";
  const notificationType = raw.notification_type ?? null;
  const action = extractAction(raw, type, hookEventName);

  return {
    source,
    hookKey: deriveHookKey(source, type, hookEventName),
    returnUrl: deriveReturnUrl(raw, env, source),
    type,
    title,
    message,
    severity: raw.severity ?? DEFAULT_SEVERITY[type] ?? "info",
    timestamp: raw.timestamp ?? new Date().toISOString(),
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : null,
    hookEventName,
    notificationType,
    action,
    soundSlot: deriveSoundSlot(type, hookEventName),
  };
}

export function deriveSoundSlot(type, hookEventName) {
  if (hookEventName === "Elicitation" || type === "needs_input") return "needs_input";
  if (type === "failure") return "failure";
  if (type === "done") return "done";
  if (type === "success") return "success";
  return "running";
}

export function isActionableEvent(event) {
  return event.action !== null || event.type === "needs_input";
}

export function shouldNotifyEvent(event) {
  return isActionableEvent(event) || ATTENTION_TYPES.has(event.type);
}

export function shouldOpenRaycast(event) {
  return false;
}

function detectSource(raw, env) {
  const explicit = raw.source ?? env.AI_NOTIFIER_SOURCE;
  if (typeof explicit === "string" && explicit.length > 0) {
    return explicit.toLowerCase();
  }
  if (env.CLAUDE_HOOK_EVENT_NAME || raw.hook_event_name) return "claude";
  return "claude";
}

function deriveHookEventName(raw, env) {
  const hookEventName =
    raw.hook_event_name ??
    raw.hookEventName ??
    raw.event_name ??
    raw.eventName ??
    env.AI_NOTIFIER_HOOK ??
    env.CLAUDE_HOOK_EVENT_NAME ??
    null;

  return typeof hookEventName === "string" ? hookEventName : null;
}

function deriveHookKey(source, type, hookEventName) {
  return `${source}:${slugify(hookEventName ?? type ?? "running")}`;
}

function deriveReturnUrl(raw, env, source) {
  const explicit = raw.returnUrl ?? raw.return_url ?? env.AI_NOTIFIER_RETURN_URL;
  if (typeof explicit === "string") return explicit;
  return DEFAULT_RETURN_URLS[source] ?? null;
}

function inferType(raw, env) {
  const hookEventName = deriveHookEventName(raw, env);
  const copilotReason = raw.reason ?? env.AI_NOTIFIER_REASON;
  if (hookEventName === "Elicitation") return "needs_input";
  if (hookEventName === "Stop") return "done";
  if (hookEventName === "sessionEnd" && copilotReason === "complete") return "done";
  if (hookEventName === "sessionEnd" && copilotReason === "error") return "failure";
  return "running";
}

function extractAction(raw, type, hookEventName) {
  const options = normalizeOptions(raw.options ?? raw.choices ?? raw.items ?? []);
  const prompt = raw.prompt ?? raw.title ?? null;
  const placeholder = raw.placeholder ?? raw.input_placeholder ?? undefined;
  const submitHint = raw.submitHint ?? raw.submit_hint ?? undefined;

  if (options.length > 0) {
    return {
      kind: "choice",
      prompt,
      options,
      placeholder,
      submitHint,
    };
  }

  if (
    hookEventName === "Elicitation" &&
    (placeholder !== undefined || type === "needs_input")
  ) {
    return {
      kind: "input",
      prompt,
      options: undefined,
      placeholder,
      submitHint,
    };
  }

  return null;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (typeof option === "string") {
        return { id: option, label: option, detail: undefined };
      }

      if (!option || typeof option !== "object") return null;

      const label = option.label ?? option.title ?? option.name ?? option.value;
      if (!label) return null;

      return {
        id: String(option.value ?? option.id ?? label ?? index),
        label: String(label),
        detail:
          typeof option.detail === "string"
            ? option.detail
            : typeof option.description === "string"
              ? option.description
              : undefined,
      };
    })
    .filter(Boolean);
}

function defaultTitle(source, type) {
  const subject = source === "claude" ? "Claude" : capitalize(source);
  if (type === "needs_input") return `${subject} needs your input`;
  if (type === "failure") return `${subject} hit an error`;
  if (type === "done") return `${subject} finished the task`;
  if (type === "success") return `${subject} completed the command`;
  return `${subject} is working`;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "running";
}

function capitalize(value) {
  if (!value) return "AI";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
