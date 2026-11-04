import { asksForInput } from "../status";
import { AgentEvent } from "../types";
import { eventTime, object, string, questionTool, isAsyncAcknowledgement } from "../adapters/events";
import { SourceContext, TranscriptSource } from "./types";

function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  return Array.isArray(value)
    ? value
        .map((item) => string(object(item).text))
        .filter(Boolean)
        .join("\n")
    : "";
}

function json(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return object(value);
  try {
    return object(JSON.parse(value));
  } catch {
    return {};
  }
}

export function questionIds(callId: string, name: string, input: unknown): string[] {
  if (!callId) return [];
  const questions = json(input).questions;
  return /request_user_input_async$/.test(name) && Array.isArray(questions) && questions.length
    ? questions.map((_, index) => `${callId}:${index}`)
    : [callId];
}

/** The desktop async tool returns {accepted:true}; answers arrive later in a user message. */
function asyncReplyIds(text: string): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(/<send_user_message_question_reply>([\s\S]*?)<\/send_user_message_question_reply>/g)) {
    try {
      const answers: unknown = JSON.parse(match[1]);
      if (!Array.isArray(answers)) continue;
      for (const answer of answers) {
        const identity: unknown = JSON.parse(string(object(answer).questionItemId));
        if (
          Array.isArray(identity) &&
          identity[0] === "request_user_input_async" &&
          typeof identity[1] === "string" &&
          Number.isInteger(identity[2])
        )
          ids.push(`${identity[1]}:${identity[2]}`);
      }
    } catch {
      /* Incomplete replies are not answers. */
    }
  }
  return ids;
}

export const codexTranscript: TranscriptSource = {
  parse(entry, session, context) {
    const payload = object(entry.payload);
    const at = eventTime(entry.timestamp, 0);
    if (!at) return [];
    const metadata = object(payload.internal_chat_message_metadata_passthrough);
    const turnId = string(payload.turn_id) || string(metadata.turn_id) || context.turnId;
    const base = { agent: session.agent, sessionId: session.sessionId, at, source: "transcript", turnId };
    const event = (type: AgentEvent["type"], extra: Partial<AgentEvent> = {}): AgentEvent[] => [{ ...base, type, ...extra }];
    if (entry.type === "session_meta") {
      if (string(payload.id) && payload.id !== session.sessionId) throw new Error("Transcript session identity mismatch");
      const origin = string(payload.originator) || string(payload.source);
      return event("started", { cwd: string(payload.cwd), host: /desktop|codex_app|chatgpt/i.test(origin) ? "app" : "cli" });
    }
    if (entry.type === "turn_context") {
      context.turnId = string(payload.turn_id) || context.turnId;
      return [];
    }
    if (entry.type === "event_msg") {
      if (payload.type === "task_started") {
        context.turnId = turnId;
        return event("progress");
      }
      if (payload.type === "task_complete") {
        const summary = string(payload.last_agent_message);
        return event("stopped", { summary, attention: asksForInput(summary) ? "question" : undefined });
      }
      if (payload.type === "turn_aborted") return event("interrupted", { summary: string(payload.reason) });
      if (payload.type === "error")
        return event(/quota|usage.limit|rate.limit/i.test(string(payload.message)) ? "quota" : "failed", {
          summary: string(payload.message),
        });
      if (payload.type === "user_message") {
        const message = string(payload.message);
        const replies = asyncReplyIds(message);
        return replies.length ? event("resolved", { requestIds: replies }) : event("progress", { title: message });
      }
    }
    if (entry.type !== "response_item") return [];
    if ((payload.type === "function_call" || payload.type === "custom_tool_call") && questionTool(string(payload.name))) {
      const ids = questionIds(string(payload.call_id), string(payload.name), payload.arguments ?? payload.input);
      if (/request_user_input_async$/.test(string(payload.name))) {
        context.asyncRequests ??= {};
        context.asyncRequests[string(payload.call_id)] = ids;
      }
      return event("needs_input", { attention: "question", requestIds: ids });
    }
    if (payload.type === "function_call" || payload.type === "custom_tool_call") return event("tool");
    if (payload.type === "function_call_output" || payload.type === "custom_tool_call_output") {
      if (isAsyncAcknowledgement(payload.output)) return [];
      const asyncIds = context.asyncRequests?.[string(payload.call_id)];
      if (asyncIds) {
        const output = json(payload.output);
        if (output.accepted !== false && !output.error && !output.isError) return [];
        delete context.asyncRequests![string(payload.call_id)];
        return event("resolved", { requestIds: asyncIds });
      }
      return event("resolved", { requestIds: string(payload.call_id) ? [string(payload.call_id)] : [] });
    }
    if (payload.type === "message" && payload.role === "user") {
      const replies = asyncReplyIds(messageText(payload.content));
      return replies.length ? event("resolved", { requestIds: replies }) : [];
    }
    return [];
  },
};

export const claudeTranscript: TranscriptSource = {
  parse(entry, session, context: SourceContext) {
    const at = eventTime(entry.timestamp, 0);
    if (!at || entry.isSidechain === true) return [];
    const base = { agent: session.agent, sessionId: session.sessionId, at, source: "transcript", turnId: context.turnId };
    const message = object(entry.message);
    const content = Array.isArray(message.content) ? message.content.map(object) : [];
    const events: AgentEvent[] = [];
    if (entry.type === "user") {
      for (const item of content)
        if (item.type === "tool_result" && string(item.tool_use_id))
          events.push({ ...base, type: "tool", requestIds: [string(item.tool_use_id)] });
      if (!events.length && !entry.isMeta) events.push({ ...base, type: "progress", title: messageText(message.content) });
    }
    if (entry.type === "assistant") {
      for (const item of content)
        if (item.type === "tool_use") {
          events.push({
            ...base,
            type: questionTool(string(item.name)) ? "needs_input" : "tool",
            attention: questionTool(string(item.name)) ? "question" : undefined,
            requestIds: questionTool(string(item.name)) && string(item.id) ? [string(item.id)] : [],
          });
        }
      if (message.stop_reason === "end_turn" || entry.stop_reason === "end_turn") {
        const summary = messageText(message.content);
        events.push({ ...base, type: "stopped", summary, attention: asksForInput(summary) ? "question" : undefined });
      }
    }
    return events;
  },
};
