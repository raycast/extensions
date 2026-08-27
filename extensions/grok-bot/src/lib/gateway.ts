import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { environment } from "@raycast/api";
import { AgentId, Bot, GatewayError, Result, err, ok } from "./types";
import { parseBot } from "./parse-bot";
import { normalizeGatewayUrl } from "./gateway-config";
import { resolveGatewayConfig } from "./preferences";
import { streamJsonObjectsSkippingField } from "./strip-json-string-field";
import { CapturedAvatar, createAvatarCaptureSink, materializeAvatarThumbnail } from "./avatar-thumbnail";

const LIST_TIMEOUT_MS = 120_000;
const SEND_TIMEOUT_MS = 30_000;
const AVATAR_FIELD = "avatarDataUrl";

type GatewayConfig = {
  baseUrl: string;
  token: string;
};

type ListAgentsOptions = {
  signal?: AbortSignal;
  onUpdate?: (bots: Bot[]) => void;
};

function getConfig(): Result<GatewayConfig, GatewayError> {
  const prefs = resolveGatewayConfig();
  if (!prefs.ok) {
    return prefs;
  }
  return ok({
    baseUrl: normalizeGatewayUrl(prefs.value.gatewayUrl),
    token: prefs.value.gatewayToken,
  });
}

function networkCause(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown network error";
}

function redactSecret(text: string, token: string): string {
  if (token.length === 0) {
    return text;
  }
  return text.split(token).join("[redacted]");
}

function requestSignal(user: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!user) {
    return timeout;
  }
  return AbortSignal.any([timeout, user]);
}

function isUserAbort(user?: AbortSignal): boolean {
  return user?.aborted === true;
}

async function postGateway(
  path: string,
  body: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<Result<Response, GatewayError>> {
  const configResult = getConfig();
  if (!configResult.ok) {
    return configResult;
  }
  const config = configResult.value;

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: requestSignal(options?.signal, options?.timeoutMs ?? SEND_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return err({ kind: "unauthorized" });
    }

    if (!response.ok) {
      const rejected = redactSecret(await response.text(), config.token);
      return err({ kind: "rejected", status: response.status, body: rejected });
    }

    return ok(response);
  } catch (error) {
    if (isUserAbort(options?.signal)) {
      return err({ kind: "unreachable", cause: "aborted" });
    }
    return err({ kind: "unreachable", cause: redactSecret(networkCause(error), config.token) });
  }
}

function parseSendPromptPayload(raw: unknown): Result<{ accepted: true }, GatewayError> {
  if (typeof raw !== "object" || raw === null) {
    return err({ kind: "invalid-response", detail: "sendPrompt payload must be an object" });
  }
  const record = raw as Record<string, unknown>;
  if (record.accepted !== true) {
    return err({ kind: "invalid-response", detail: "sendPrompt did not accept the prompt" });
  }
  return ok({ accepted: true });
}

function finishAgentList(input: {
  sawList: boolean;
  complete: boolean;
  emitted: number;
  bots: Bot[];
  firstParseError: string;
}): Result<Bot[], GatewayError> {
  if (input.bots.length > 0) {
    return ok(input.bots);
  }
  if (input.sawList && input.complete && input.emitted === 0) {
    return ok([]);
  }
  if (input.sawList && input.emitted > 0) {
    return err({ kind: "invalid-response", detail: input.firstParseError || "agents did not parse" });
  }
  if (!input.complete) {
    return err({ kind: "invalid-response", detail: "response is not valid JSON" });
  }
  return err({ kind: "invalid-response", detail: "expected array or { agents: [...] }" });
}

export async function listAgents(options?: ListAgentsOptions): Promise<Result<Bot[], GatewayError>> {
  const response = await postGateway("/api/listAgents", "{}", {
    signal: options?.signal,
    timeoutMs: LIST_TIMEOUT_MS,
  });
  if (!response.ok) {
    return response;
  }

  const collected: Bot[] = [];
  let emitted = 0;
  let firstParseError = "";
  let thumbs = Promise.resolve();
  const avatarDir = join(environment.supportPath, "avatars");

  const dropCapture = (captured: CapturedAvatar | null): void => {
    if (captured === null) {
      return;
    }
    try {
      unlinkSync(captured.sourcePath);
    } catch {
      return;
    }
  };

  const onObject = (json: string, captured: CapturedAvatar | null) => {
    emitted += 1;
    if (options?.signal?.aborted) {
      dropCapture(captured);
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      dropCapture(captured);
      if (firstParseError.length === 0) {
        firstParseError = "agent object is not valid JSON";
      }
      return;
    }
    const parsed = parseBot(raw);
    if (!parsed.ok) {
      dropCapture(captured);
      if (firstParseError.length === 0) {
        firstParseError = parsed.error;
      }
      return;
    }
    const bot = parsed.value;
    collected.push(bot);
    options?.onUpdate?.([...collected]);

    if (captured === null) {
      return;
    }
    thumbs = thumbs.then(async () => {
      if (options?.signal?.aborted) {
        dropCapture(captured);
        return;
      }
      const hash = await materializeAvatarThumbnail({
        supportPath: environment.supportPath,
        agentId: bot.id,
        sourcePath: captured.sourcePath,
        hash: captured.hash,
      });
      bot.avatarHash = hash;
      if (!options?.signal?.aborted) {
        options?.onUpdate?.([...collected]);
      }
    });
  };

  try {
    const http = response.value;
    if (!http.body) {
      return err({ kind: "invalid-response", detail: "response has no body" });
    }

    const streamed = await streamJsonObjectsSkippingField(http.body, AVATAR_FIELD, onObject, {
      createSink: () => createAvatarCaptureSink(avatarDir),
      afterChunk: () => thumbs,
    });

    if (options?.signal?.aborted) {
      return err({ kind: "unreachable", cause: "aborted" });
    }

    await thumbs;

    return finishAgentList({
      sawList: streamed.sawList,
      complete: streamed.complete,
      emitted,
      bots: collected,
      firstParseError,
    });
  } catch (error) {
    if (isUserAbort(options?.signal)) {
      return err({ kind: "unreachable", cause: "aborted" });
    }
    return err({ kind: "invalid-response", detail: networkCause(error) });
  }
}

export async function sendPrompt(input: {
  agentId: AgentId;
  prompt: string;
}): Promise<Result<{ accepted: true }, GatewayError>> {
  const response = await postGateway(
    "/api/sendPrompt",
    JSON.stringify({ agentId: input.agentId, prompt: input.prompt }),
    { timeoutMs: SEND_TIMEOUT_MS },
  );
  if (!response.ok) {
    return response;
  }

  try {
    const raw: unknown = await response.value.json();
    return parseSendPromptPayload(raw);
  } catch {
    return err({ kind: "invalid-response", detail: "response is not valid JSON" });
  }
}
