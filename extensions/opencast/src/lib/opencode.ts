import {
  createOpencodeClient,
  type Message,
  type OpencodeClient,
  type Part,
  type PermissionRequest,
  type ProviderListResponse,
  type QuestionRequest,
  type Session,
  type SessionStatus,
} from "@opencode-ai/sdk/v2";
import type { ModelOption, OpencodeTarget, WorkspaceOption } from "./types";
import { getPreferences } from "./preferences";
import { buildAuthHeader } from "./client-config";
import { mapProviderResponseToModels } from "./model-options";

export type OpencodeClientLike = OpencodeClient;

type PromptInput = {
  sessionID: string;
  target: OpencodeTarget;
  text: string;
  model?: {
    providerID: string;
    modelID: string;
  };
};

type CreateSessionInput = {
  target: OpencodeTarget;
  title?: string;
};

export type SessionMessageRecord = {
  info: Message;
  parts: Part[];
};

export function buildClientConfig(serverUrl: string) {
  const preferences = getPreferences();
  const authHeader = buildAuthHeader(preferences.username, preferences.password);
  return {
    baseUrl: serverUrl,
    responseStyle: "data" as const,
    throwOnError: true as const,
    headers: authHeader ? { Authorization: authHeader } : undefined,
  };
}

export function createClient(serverUrl: string) {
  return createOpencodeClient(buildClientConfig(serverUrl));
}

function targetParams(target: OpencodeTarget) {
  return {
    directory: target.directory,
  };
}

function requestOptions(target: OpencodeTarget) {
  return target.workspace
    ? {
        headers: {
          "x-opencode-workspace": target.workspace,
        },
      }
    : undefined;
}

function unwrap<T>(result: T | { data: T }): T {
  if (typeof result === "object" && result !== null && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

export async function listSessions(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  search?: string,
): Promise<Session[]> {
  if (search?.trim()) {
    const sessions = await client.experimental.session.list(
      {
        ...targetParams(target),
        limit: 100,
        search: search.trim(),
      },
      requestOptions(target),
    );
    return unwrap(sessions) as unknown as Session[];
  }
  return unwrap(
    await client.session.list(
      {
        ...targetParams(target),
        limit: 100,
      },
      requestOptions(target),
    ),
  ) as Session[];
}

export async function listSessionStatuses(
  client: OpencodeClientLike,
  target: OpencodeTarget,
): Promise<Record<string, SessionStatus>> {
  return unwrap(await client.session.status(targetParams(target), requestOptions(target))) as Record<
    string,
    SessionStatus
  >;
}

export async function getMessages(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  sessionID: string,
): Promise<SessionMessageRecord[]> {
  return unwrap(
    await client.session.messages(
      {
        ...targetParams(target),
        sessionID,
        limit: 200,
      },
      requestOptions(target),
    ),
  ) as SessionMessageRecord[];
}

export async function getSession(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  sessionID: string,
): Promise<Session> {
  return unwrap(
    await client.session.get(
      {
        ...targetParams(target),
        sessionID,
      },
      requestOptions(target),
    ),
  ) as Session;
}

export async function createSession(client: OpencodeClientLike, input: CreateSessionInput): Promise<Session> {
  return unwrap(
    await client.session.create(
      {
        ...targetParams(input.target),
        title: input.title?.trim() || undefined,
      },
      requestOptions(input.target),
    ),
  ) as Session;
}

export async function promptSession(client: OpencodeClientLike, input: PromptInput): Promise<void> {
  await client.session.promptAsync(
    {
      ...targetParams(input.target),
      sessionID: input.sessionID,
      model: input.model,
      parts: [{ type: "text", text: input.text }],
    },
    requestOptions(input.target),
  );
}

export async function abortSession(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  sessionID: string,
): Promise<void> {
  await client.session.abort(
    {
      ...targetParams(target),
      sessionID,
    },
    requestOptions(target),
  );
}

export async function forkSession(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  sessionID: string,
): Promise<Session> {
  return unwrap(
    await client.session.fork(
      {
        ...targetParams(target),
        sessionID,
      },
      requestOptions(target),
    ),
  ) as Session;
}

export async function renameSession(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  sessionID: string,
  title: string,
): Promise<Session> {
  return unwrap(
    await client.session.update(
      {
        ...targetParams(target),
        sessionID,
        title,
      },
      requestOptions(target),
    ),
  ) as Session;
}

export async function listPendingPermissions(
  client: OpencodeClientLike,
  target: OpencodeTarget,
): Promise<PermissionRequest[]> {
  return unwrap(await client.permission.list(targetParams(target), requestOptions(target))) as PermissionRequest[];
}

export async function respondToPermission(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  requestID: string,
  reply: "once" | "always" | "reject",
): Promise<void> {
  await client.permission.reply(
    {
      ...targetParams(target),
      requestID,
      reply,
    },
    requestOptions(target),
  );
}

export async function listPendingQuestions(
  client: OpencodeClientLike,
  target: OpencodeTarget,
): Promise<QuestionRequest[]> {
  return unwrap(await client.question.list(targetParams(target), requestOptions(target))) as QuestionRequest[];
}

export async function replyToQuestion(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  requestID: string,
  answers: Array<Array<string>>,
): Promise<void> {
  await client.question.reply(
    {
      ...targetParams(target),
      requestID,
      answers,
    },
    requestOptions(target),
  );
}

export async function rejectQuestion(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  requestID: string,
): Promise<void> {
  await client.question.reject(
    {
      ...targetParams(target),
      requestID,
    },
    requestOptions(target),
  );
}

export async function listWorkspaces(client: OpencodeClientLike, target: OpencodeTarget): Promise<WorkspaceOption[]> {
  void client;
  void target;
  return [];
}

export async function listModels(client: OpencodeClientLike, target: OpencodeTarget): Promise<ModelOption[]> {
  const response = unwrap(
    await client.provider.list(
      {
        directory: target.directory,
      },
      requestOptions(target),
    ),
  ) as ProviderListResponse;
  return mapProviderResponseToModels(response);
}

export async function subscribeToEvents(
  client: OpencodeClientLike,
  target: OpencodeTarget,
  signal: AbortSignal,
  onEvent: (event: unknown) => void,
  onError?: (error: unknown) => void,
): Promise<void> {
  const subscription = await client.event.subscribe(
    {
      ...targetParams(target),
    },
    {
      signal,
      onSseError: onError,
      headers: requestOptions(target)?.headers,
    },
  );
  for await (const event of subscription.stream) {
    if (signal.aborted) {
      break;
    }
    onEvent(event);
  }
}
