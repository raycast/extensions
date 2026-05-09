import http from "node:http";
import { getOpenAICodexRaycastModels } from "../lib/provider-yaml.js";
import { DEFAULT_PROXY_PORT } from "../lib/paths.js";
import {
  createCompletion,
  makeChunk,
  type ChatCompletionRequest,
} from "./openai-codex-client.js";

const port = Number(
  process.env.RAYCAST_CHATGPT_PROXY_PORT || DEFAULT_PROXY_PORT,
);
const token = process.env.RAYCAST_CHATGPT_PROXY_TOKEN || "";

function sendJson(
  response: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function unauthorized(response: http.ServerResponse): void {
  sendJson(response, 401, {
    error: { message: "Unauthorized", type: "invalid_request_error" },
  });
}

function isAuthorized(request: http.IncomingMessage): boolean {
  if (!token) {
    return false;
  }
  return request.headers.authorization === `Bearer ${token}`;
}

function isLocalRaycastProviderRequest(
  request: http.IncomingMessage,
  url: URL,
): boolean {
  if (!url.pathname.startsWith("/v1/")) {
    return false;
  }
  const remoteAddress = request.socket.remoteAddress;
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

async function readBody(request: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function modelList() {
  return {
    object: "list",
    data: getOpenAICodexRaycastModels().map((model) => ({
      id: model.id,
      object: "model",
      created: 0,
      owned_by: "chatgpt-account",
    })),
  };
}

async function handleChat(
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  const body = JSON.parse(await readBody(request)) as ChatCompletionRequest;
  const id = `chatcmpl-${Date.now().toString(36)}`;
  const content = await createCompletion(body);

  if (body.stream) {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    response.write(
      `data: ${JSON.stringify(makeChunk({ id, model: body.model, content }))}\n\n`,
    );
    response.write(
      `data: ${JSON.stringify(makeChunk({ id, model: body.model, finishReason: "stop" }))}\n\n`,
    );
    response.write("data: [DONE]\n\n");
    response.end();
    return;
  }

  sendJson(response, 200, {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "127.0.0.1"}`,
    );
    if (url.pathname === "/health") {
      if (!isAuthorized(request)) {
        unauthorized(response);
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }
    if (
      !isAuthorized(request) &&
      !isLocalRaycastProviderRequest(request, url)
    ) {
      unauthorized(response);
      return;
    }
    if (request.method === "GET" && url.pathname === "/v1/models") {
      sendJson(response, 200, modelList());
      return;
    }
    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      await handleChat(request, response);
      return;
    }
    sendJson(response, 404, {
      error: { message: "Not found", type: "invalid_request_error" },
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        message: error instanceof Error ? error.message : String(error),
        type: "server_error",
      },
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `raycast-chatgpt-provider listening on http://127.0.0.1:${port}\n`,
  );
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
