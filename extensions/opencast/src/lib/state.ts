import type { Part, PermissionRequest, QuestionRequest, SessionStatus, Todo } from "@opencode-ai/sdk/v2";
import type { MessageWithParts, PendingState, SessionTranscriptState } from "./types";

export function createEmptyTranscriptState(sessionID: string): SessionTranscriptState {
  return {
    sessionID,
    messages: [],
    todos: [],
    pending: {
      permissions: [],
      questions: [],
    },
  };
}

export function upsertMessage(messages: MessageWithParts[], next: MessageWithParts): MessageWithParts[] {
  const index = messages.findIndex((item) => item.info.id === next.info.id);
  if (index === -1) {
    return [...messages, next];
  }
  const copy = [...messages];
  copy[index] = next;
  return copy;
}

function upsertPart(parts: Part[], next: Part): Part[] {
  const index = parts.findIndex((item) => item.id === next.id);
  if (index === -1) {
    return [...parts, next];
  }
  const copy = [...parts];
  copy[index] = next;
  return copy;
}

function updatePartField(part: Part, field: string, delta: string): Part {
  const candidate = part as Record<string, unknown>;
  const current = candidate[field];
  if (typeof current === "string") {
    return {
      ...part,
      [field]: current + delta,
    } as Part;
  }
  return part;
}

function removePendingPermission(pending: PendingState, requestID: string): PendingState {
  return {
    ...pending,
    permissions: pending.permissions.filter((item) => item.id !== requestID),
  };
}

function removePendingQuestion(pending: PendingState, requestID: string): PendingState {
  return {
    ...pending,
    questions: pending.questions.filter((item) => item.id !== requestID),
  };
}

export type SessionEventLike =
  | { type: "message.updated"; properties: { info: MessageWithParts["info"] } }
  | { type: "message.removed"; properties: { messageID: string } }
  | { type: "message.part.updated"; properties: { part: Part } }
  | {
      type: "message.part.delta";
      properties: {
        messageID: string;
        partID: string;
        field: string;
        delta: string;
      };
    }
  | {
      type: "message.part.removed";
      properties: { messageID: string; partID: string };
    }
  | {
      type: "session.status";
      properties: { sessionID: string; status: SessionStatus };
    }
  | { type: "session.idle"; properties: { sessionID: string } }
  | {
      type: "session.error";
      properties: { sessionID?: string; error?: { message?: string } };
    }
  | { type: "todo.updated"; properties: { sessionID: string; todos: Todo[] } }
  | { type: "permission.asked"; properties: PermissionRequest }
  | { type: "permission.replied"; properties: { requestID: string } }
  | { type: "question.asked"; properties: QuestionRequest }
  | { type: "question.replied"; properties: { requestID: string } }
  | { type: "question.rejected"; properties: { requestID: string } };

export function reduceSessionEvent(state: SessionTranscriptState, event: SessionEventLike): SessionTranscriptState {
  switch (event.type) {
    case "message.updated": {
      const existing = state.messages.find((item) => item.info.id === event.properties.info.id);
      return {
        ...state,
        messages: upsertMessage(state.messages, {
          info: event.properties.info,
          parts: existing?.parts ?? [],
        }),
      };
    }
    case "message.removed":
      return {
        ...state,
        messages: state.messages.filter((item) => item.info.id !== event.properties.messageID),
      };
    case "message.part.updated":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.info.id === event.properties.part.messageID
            ? {
                ...message,
                parts: upsertPart(message.parts, event.properties.part),
              }
            : message,
        ),
      };
    case "message.part.delta":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.info.id !== event.properties.messageID
            ? message
            : {
                ...message,
                parts: message.parts.map((part) =>
                  part.id === event.properties.partID
                    ? updatePartField(part, event.properties.field, event.properties.delta)
                    : part,
                ),
              },
        ),
      };
    case "message.part.removed":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.info.id !== event.properties.messageID
            ? message
            : {
                ...message,
                parts: message.parts.filter((part) => part.id !== event.properties.partID),
              },
        ),
      };
    case "session.status":
      return {
        ...state,
        status: event.properties.status,
      };
    case "session.idle":
      return {
        ...state,
        status: { type: "idle" },
      };
    case "session.error":
      return {
        ...state,
        error: event.properties.error?.message ?? "Unknown session error",
      };
    case "todo.updated":
      return {
        ...state,
        todos: event.properties.todos,
      };
    case "permission.asked":
      return {
        ...state,
        pending: {
          ...state.pending,
          permissions: [
            ...state.pending.permissions.filter((item) => item.id !== event.properties.id),
            event.properties,
          ],
        },
      };
    case "permission.replied":
      return {
        ...state,
        pending: removePendingPermission(state.pending, event.properties.requestID),
      };
    case "question.asked":
      return {
        ...state,
        pending: {
          ...state.pending,
          questions: [...state.pending.questions.filter((item) => item.id !== event.properties.id), event.properties],
        },
      };
    case "question.replied":
    case "question.rejected":
      return {
        ...state,
        pending: removePendingQuestion(state.pending, event.properties.requestID),
      };
    default:
      return state;
  }
}

export function seedPendingState(permissions: PermissionRequest[], questions: QuestionRequest[]): PendingState {
  return {
    permissions,
    questions,
  };
}
