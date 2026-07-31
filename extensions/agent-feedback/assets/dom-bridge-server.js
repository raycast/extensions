const { createServer } = require("node:http");
const { spawnSync } = require("node:child_process");
const {
  appendFileSync,
  readFileSync,
  renameSync,
  writeFileSync,
} = require("node:fs");

const [portArgument, eventsPath, statusPath, scriptPath, token, recorderPidArgument] =
  process.argv.slice(2);
const port = Number(portArgument);
const recorderPid = Number(recorderPidArgument);
const source = readFileSync(scriptPath, "utf8").replaceAll(
  "__AGENT_FEEDBACK_SESSION_TOKEN__",
  token,
);
const status = {
  startedAt: new Date().toISOString(),
  connectedAt: null,
  lastSeenAt: null,
  activePage: null,
  focused: false,
  eventCount: 0,
};

function writeStatus() {
  const temporaryPath = `${statusPath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(status, null, 2));
  renameSync(temporaryPath, statusPath);
}

function headers(request) {
  return {
    "Access-Control-Allow-Origin": request.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Agent-Feedback-Token",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function validToken(request) {
  return request.headers["x-agent-feedback-token"] === token;
}

function cleanText(value, maximum) {
  return typeof value === "string" ? value.slice(0, maximum) : "";
}

function normalizeEvent(value) {
  if (!value || typeof value !== "object") return null;
  if (!Number.isFinite(value.timestampMs)) return null;
  if (value.kind === "clear") {
    return { kind: "clear", timestampMs: value.timestampMs };
  }
  if (value.kind !== "hover") return null;
  return {
    kind: "hover",
    clientId: cleanText(value.clientId, 100),
    capturedAt: cleanText(value.capturedAt, 40),
    timestampMs: value.timestampMs,
    pageUrl: cleanText(value.pageUrl, 1000),
    tag: cleanText(value.tag, 80),
    signature: cleanText(value.signature, 300),
    selector: cleanText(value.selector, 1000),
    text: cleanText(value.text, 240),
    attributes:
      value.attributes && typeof value.attributes === "object"
        ? value.attributes
        : {},
    classNames: Array.isArray(value.classNames)
      ? value.classNames.slice(0, 16).map((item) => cleanText(item, 160))
      : [],
    ancestors: Array.isArray(value.ancestors)
      ? value.ancestors.slice(0, 5).map((item) => cleanText(item, 300))
      : [],
    rect:
      value.rect && typeof value.rect === "object"
        ? {
            x: Number(value.rect.x) || 0,
            y: Number(value.rect.y) || 0,
            width: Number(value.rect.width) || 0,
            height: Number(value.rect.height) || 0,
          }
        : { x: 0, y: 0, width: 0, height: 0 },
  };
}

function noteConnection(event) {
  const now = new Date().toISOString();
  status.connectedAt ||= now;
  status.lastSeenAt = now;
  status.activePage = cleanText(event.pageUrl, 1000) || status.activePage;
  status.focused = Boolean(event.focused);
  writeStatus();
}

const server = createServer((request, response) => {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || `127.0.0.1:${port}`}`,
  );
  const responseHeaders = headers(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, responseHeaders);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent-feedback.js") {
    response.writeHead(200, {
      ...responseHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
    });
    response.end(source);
    return;
  }

  if (request.method === "GET" && url.pathname === "/status") {
    response.writeHead(200, {
      ...responseHeaders,
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ active: true, session: token.slice(0, 12) }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/events") {
    if (!validToken(request)) {
      response.writeHead(401, responseHeaders);
      response.end();
      return;
    }
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) request.destroy();
    });
    request.on("end", () => {
      try {
        const event = JSON.parse(body);
        noteConnection(event);
        if (
          (event.kind === "hover" || event.kind === "clear") &&
          event.visibilityState === "visible" &&
          event.focused === true
        ) {
          const normalized = normalizeEvent(event);
          if (normalized) {
            appendFileSync(eventsPath, `${JSON.stringify(normalized)}\n`);
            status.eventCount += 1;
            writeStatus();
          }
        }
        response.writeHead(204, responseHeaders);
        response.end();
      } catch {
        response.writeHead(400, responseHeaders);
        response.end();
      }
    });
    return;
  }

  response.writeHead(404, responseHeaders);
  response.end();
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  status.stoppedAt = new Date().toISOString();
  try {
    writeStatus();
  } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}

writeStatus();
server.on("error", (error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
server.listen(port, "127.0.0.1");

const recorderMonitor = setInterval(() => {
  const recorderStatus = spawnSync(
    "/bin/ps",
    ["-p", String(recorderPid), "-o", "stat="],
    { encoding: "utf8" },
  ).stdout.trim();
  if (!recorderStatus || recorderStatus.startsWith("Z")) {
    clearInterval(recorderMonitor);
    shutdown();
  }
}, 1000);
recorderMonitor.unref();
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
