const paperMcpEndpoint = "http://127.0.0.1:29979/mcp";
const mcpProtocolVersion = "2025-11-25";
const mcpAcceptHeader = "application/json, text/event-stream";
const paperMcpRequestTimeoutMs = 8_000;

export type PaperFile = {
  id: string;
  name: string;
  open?: boolean;
  active?: boolean;
  updatedAt?: number;
  createdAt?: number;
};

export const paperTokenTypes = [
  "breakpoint",
  "color",
  "container",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "radius",
  "spacing",
] as const;

export type PaperTokenType = (typeof paperTokenTypes)[number];

export type PaperToken = {
  name: string;
  type: PaperTokenType;
  value: string | number;
  description?: string;
};

export type CreatePaperTokenInput = PaperToken;

export type UpdatePaperTokenInput = {
  name: string;
  newName?: string;
  value?: string | number;
  description?: string;
};

type ListFilesResult = {
  teamId: string;
  teamName: string;
  files: PaperFile[];
  count: number;
};

export class PaperMcpUnavailableError extends Error {
  constructor() {
    super("Paper Desktop's local MCP endpoint is unavailable.");
    this.name = "PaperMcpUnavailableError";
  }
}

class PaperMcpResponseError extends Error {
  constructor() {
    super("Paper Desktop returned an invalid MCP response.");
    this.name = "PaperMcpResponseError";
  }
}

type PaperMcpSession = {
  protocolVersion: string;
  sessionId?: string;
  signal?: AbortSignal;
};

export function isOpenInPaper(file: PaperFile): boolean {
  return file.open === true || file.active === true;
}

export function getPaperErrorMessage(error: unknown): string {
  if (error instanceof PaperMcpUnavailableError) {
    return "Open Paper Desktop with any Paper file loaded, then try again.";
  }

  if (error instanceof PaperMcpResponseError) {
    return "Paper Desktop returned an unexpected response. Make sure a Paper file is loaded, then try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Open Paper Desktop with a Paper file loaded and try again.";
}

export async function listPaperFiles(
  signal?: AbortSignal,
): Promise<PaperFile[]> {
  return withPaperMcpSession(async (session) => {
    const listFilesResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "list_files",
          arguments: { limit: 100 },
        },
      },
      session,
    );

    return parseListFilesToolResult(
      await parseJsonRpcResult(listFilesResponse, 2),
    ).files;
  }, signal);
}

export async function createPaperFile(
  name: string,
  signal?: AbortSignal,
): Promise<string> {
  return withPaperMcpSession(async (session) => {
    const createFileResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "create_file",
          arguments: { name },
        },
      },
      session,
    );

    return parseCreatedPaperFileId(
      await parseJsonRpcResult(createFileResponse, 2),
    );
  }, signal);
}

export async function listPaperTokens(
  fileId: string,
  signal?: AbortSignal,
): Promise<PaperToken[]> {
  return withPaperMcpSession(async (session) => {
    const getTokensResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_tokens",
          arguments: { fileId, format: "json" },
        },
      },
      session,
    );

    return parsePaperTokens(
      parseJson(parseToolText(await parseJsonRpcResult(getTokensResponse, 2))),
    );
  }, signal);
}

export async function createPaperToken(
  fileId: string,
  token: CreatePaperTokenInput,
  signal?: AbortSignal,
): Promise<void> {
  return withPaperMcpSession(async (session) => {
    const createTokensResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "create_tokens",
          arguments: { fileId, tokens: [token] },
        },
      },
      session,
    );

    parsePaperTokenMutation(
      parseJson(
        parseToolText(await parseJsonRpcResult(createTokensResponse, 2)),
      ),
    );
  }, signal);
}

export async function updatePaperToken(
  fileId: string,
  token: UpdatePaperTokenInput,
  signal?: AbortSignal,
): Promise<void> {
  return withPaperMcpSession(async (session) => {
    const setTokensResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "set_tokens",
          arguments: { fileId, tokens: [token] },
        },
      },
      session,
    );

    parsePaperTokenMutation(
      parseJson(parseToolText(await parseJsonRpcResult(setTokensResponse, 2))),
    );
  }, signal);
}

export async function deletePaperToken(
  fileId: string,
  name: string,
  signal?: AbortSignal,
): Promise<void> {
  return withPaperMcpSession(async (session) => {
    const setTokensResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "set_tokens",
          arguments: { fileId, tokens: [{ name, delete: true }] },
        },
      },
      session,
    );

    parsePaperTokenMutation(
      parseJson(parseToolText(await parseJsonRpcResult(setTokensResponse, 2))),
    );
  }, signal);
}

export function getPaperFileUrl(fileId: string): string {
  return `paper://file/${encodeURIComponent(fileId)}`;
}

async function withPaperMcpSession<T>(
  operation: (session: PaperMcpSession) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  let session: PaperMcpSession | undefined;

  try {
    session = {
      protocolVersion: mcpProtocolVersion,
      signal,
    };

    const initializeResponse = await postPaperMcpRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: mcpProtocolVersion,
          capabilities: {},
          clientInfo: {
            name: "paper-design",
            version: "1.0.0",
          },
        },
      },
      session,
    );

    session.sessionId =
      initializeResponse.headers.get("mcp-session-id") ?? undefined;
    session.protocolVersion = parseNegotiatedProtocolVersion(
      await parseJsonRpcResult(initializeResponse, 1),
    );

    await notifyPaperMcpInitialized(session);

    return await operation(session);
  } finally {
    if (session?.sessionId) {
      await closePaperMcpSession(session);
    }
  }
}

async function postPaperMcpRequest(
  payload: object,
  session?: PaperMcpSession,
): Promise<Response> {
  return fetchPaperMcp(
    {
      method: "POST",
      headers: createPaperMcpHeaders(session),
      body: JSON.stringify(payload),
    },
    session?.signal,
  );
}

async function notifyPaperMcpInitialized(
  session: PaperMcpSession,
): Promise<void> {
  await fetchPaperMcp(
    {
      method: "POST",
      headers: createPaperMcpHeaders(session),
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    },
    session.signal,
  );
}

async function closePaperMcpSession(session: PaperMcpSession): Promise<void> {
  try {
    await fetchPaperMcp({
      method: "DELETE",
      headers: createPaperMcpHeaders(session),
    });
  } catch {
    // Session cleanup is best-effort and must not replace the primary result.
  }
}

async function fetchPaperMcp(
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;

  try {
    const timeoutSignal = AbortSignal.timeout(paperMcpRequestTimeoutMs);
    response = await fetch(paperMcpEndpoint, {
      ...init,
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new PaperMcpUnavailableError();
  }

  if (!response.ok) {
    if (response.status === 404 || response.status >= 500) {
      throw new PaperMcpUnavailableError();
    }

    throw new PaperMcpResponseError();
  }

  return response;
}

function createPaperMcpHeaders(
  session?: PaperMcpSession,
): Record<string, string> {
  return {
    Accept: mcpAcceptHeader,
    "Content-Type": "application/json",
    ...(session ? { "MCP-Protocol-Version": session.protocolVersion } : {}),
    ...(session?.sessionId ? { "MCP-Session-Id": session.sessionId } : {}),
  };
}

async function parseJsonRpcResult(
  response: Response,
  requestId: number,
): Promise<unknown> {
  const body = await response.text();
  const message = parseMcpResponseBody(
    body,
    response.headers.get("content-type"),
    requestId,
  );

  if (
    !isRecord(message) ||
    message.jsonrpc !== "2.0" ||
    message.id !== requestId ||
    "error" in message ||
    !("result" in message)
  ) {
    throw new PaperMcpResponseError();
  }

  return message.result;
}

function parseMcpResponseBody(
  body: string,
  contentType: string | null,
  requestId: number,
): unknown {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new PaperMcpResponseError();
  }

  if (
    contentType?.includes("text/event-stream") ||
    /^data:/m.test(trimmedBody)
  ) {
    const responseMessage = parseSseDataEvents(body)
      .filter((data) => data.trim())
      .map(parseJson)
      .find(
        (message) =>
          isRecord(message) &&
          message.jsonrpc === "2.0" &&
          message.id === requestId &&
          ("result" in message || "error" in message),
      );

    if (!responseMessage) {
      throw new PaperMcpResponseError();
    }

    return responseMessage;
  }

  return parseJson(trimmedBody);
}

function parseSseDataEvents(body: string): string[] {
  const events: string[] = [];
  let dataLines: string[] = [];

  const finishEvent = () => {
    if (dataLines.length > 0) {
      events.push(dataLines.join("\n"));
      dataLines = [];
    }
  };

  for (const line of body.split(/\r?\n/)) {
    if (line === "") {
      finishEvent();
      continue;
    }

    if (line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);

    if (field !== "data") {
      continue;
    }

    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    dataLines.push(value);
  }

  finishEvent();
  return events;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new PaperMcpResponseError();
  }
}

function parseNegotiatedProtocolVersion(result: unknown): string {
  if (
    !isRecord(result) ||
    typeof result.protocolVersion !== "string" ||
    result.protocolVersion.length === 0
  ) {
    throw new PaperMcpResponseError();
  }

  return result.protocolVersion;
}

function parseListFilesToolResult(result: unknown): ListFilesResult {
  return parseListFilesResult(parseJson(parseToolText(result)));
}

function parseCreatedPaperFileId(result: unknown): string {
  const parsedResult = parseJson(parseToolText(result));

  if (typeof parsedResult === "string" && parsedResult) {
    return parsedResult;
  }

  if (!isRecord(parsedResult)) {
    throw new PaperMcpResponseError();
  }

  if (typeof parsedResult.fileId === "string" && parsedResult.fileId) {
    return parsedResult.fileId;
  }

  if (typeof parsedResult.id === "string" && parsedResult.id) {
    return parsedResult.id;
  }

  throw new PaperMcpResponseError();
}

function parsePaperTokens(result: unknown): PaperToken[] {
  if (!isRecord(result) || !Array.isArray(result.tokens)) {
    throw new PaperMcpResponseError();
  }

  return result.tokens.map(parsePaperToken);
}

function parsePaperToken(value: unknown): PaperToken {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    !isPaperTokenType(value.type) ||
    (typeof value.value !== "string" && typeof value.value !== "number") ||
    !isOptionalString(value.description)
  ) {
    throw new PaperMcpResponseError();
  }

  return {
    name: value.name,
    type: value.type,
    value: value.value,
    description:
      typeof value.description === "string" ? value.description : undefined,
  };
}

function parsePaperTokenMutation(result: unknown): void {
  const entries = Array.isArray(result)
    ? result
    : isRecord(result) && Array.isArray(result.results)
      ? result.results
      : [result];

  if (
    entries.length === 0 ||
    entries.some(
      (entry) =>
        !isRecord(entry) ||
        typeof entry.result !== "string" ||
        entry.result === "error",
    )
  ) {
    throw new PaperMcpResponseError();
  }
}

function parseToolText(result: unknown): string {
  if (
    !isRecord(result) ||
    result.isError === true ||
    !Array.isArray(result.content)
  ) {
    throw new PaperMcpResponseError();
  }

  const textContent = result.content.find(isTextContent);

  if (!textContent) {
    throw new PaperMcpResponseError();
  }

  return textContent.text;
}

function parseListFilesResult(value: unknown): ListFilesResult {
  if (
    !isRecord(value) ||
    typeof value.teamId !== "string" ||
    typeof value.teamName !== "string" ||
    !Array.isArray(value.files) ||
    typeof value.count !== "number" ||
    !Number.isFinite(value.count)
  ) {
    throw new PaperMcpResponseError();
  }

  return {
    teamId: value.teamId,
    teamName: value.teamName,
    files: value.files.map(parsePaperFile),
    count: value.count,
  };
}

function parsePaperFile(value: unknown): PaperFile {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !isOptionalBoolean(value.open) ||
    !isOptionalBoolean(value.active) ||
    !isOptionalNumber(value.updatedAt) ||
    !isOptionalNumber(value.createdAt)
  ) {
    throw new PaperMcpResponseError();
  }

  return {
    id: value.id,
    name: value.name,
    open: value.open,
    active: value.active,
    updatedAt: value.updatedAt,
    createdAt: value.createdAt,
  };
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isPaperTokenType(value: unknown): value is PaperTokenType {
  return (
    typeof value === "string" &&
    (paperTokenTypes as readonly string[]).includes(value)
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTextContent(
  value: unknown,
): value is { type: "text"; text: string } {
  return (
    isRecord(value) && value.type === "text" && typeof value.text === "string"
  );
}
