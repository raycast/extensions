#!/usr/bin/env node
/*
 * ten-four-shelf: the Ten Four shelf service.
 *
 * Owns the JSON store (~/.ten-four.json) and exposes a small REST API at /shelf.
 * The tenfour CLI pushes to it; the Raycast extension polls it. Bind loopback
 * only and let `tailscale serve` provide TLS + tailnet exposure.
 *
 *   GET    /shelf      -> Item[] (pinned first, then newest)
 *   POST   /shelf      -> add {label?, text} ; returns the Item
 *   PATCH  /shelf/:id  -> set {pinned}       ; returns the Item
 *   DELETE /shelf/:id  -> remove one
 *   DELETE /shelf      -> clear all
 *
 * Store: ~/.ten-four.json  (override TENFOUR_FILE)
 * Port:  7801             (override PORT or TENFOUR_PORT)
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const STORE =
  process.env.TENFOUR_FILE || path.join(os.homedir(), ".ten-four.json");
const PORT = Number(process.env.PORT || process.env.TENFOUR_PORT || 7801);
const HOST = process.env.TENFOUR_HOST || "127.0.0.1";
const MAX_ITEMS = 200;

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(items) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  // Write then rename, which is atomic within a directory, so a reader never
  // catches a half-written store. Each request handler loads and saves without
  // awaiting in between, so mutations inside this process cannot interleave;
  // the rename protects against readers, and against a CLI writing the same
  // file directly when it is run on the host in local mode.
  const tmp = `${STORE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, STORE);
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}

function firstLine(text, max = 60) {
  const line =
    text.replace(/\r/g, "").split("\n").find((l) => l.trim()) || text;
  const t = line.trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncate(items) {
  const pinned = items.filter((it) => it.pinned);
  const rest = items.filter((it) => !it.pinned).slice(0, MAX_ITEMS);
  return [...pinned, ...rest].slice(0, MAX_ITEMS + pinned.length);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean); // ["shelf", id?]
  if (parts[0] !== "shelf") return json(res, 404, { error: "not found" });
  const id = parts[1];

  try {
    if (req.method === "GET" && !id) {
      return json(res, 200, sortItems(load()));
    }
    if (req.method === "POST" && !id) {
      const body = JSON.parse((await readBody(req)) || "{}");
      const text = String(body.text || "").replace(/\n$/, "");
      if (!text.trim()) return json(res, 400, { error: "text is required" });
      const item = {
        id: makeId(),
        label: body.label || firstLine(text),
        text,
        ts: Date.now(),
        pinned: false,
        // Optional provenance ("project · session8") from pushers that send it, e.g. the
        // guppy shelf-push hook. Viewers that don't know the field just ignore it.
        ...(body.source ? { source: String(body.source).slice(0, 120) } : {}),
      };
      save(truncate([item, ...load()]));
      return json(res, 201, item);
    }
    if (req.method === "PATCH" && id) {
      const body = JSON.parse((await readBody(req)) || "{}");
      const items = load();
      const item = items.find((i) => i.id === id);
      if (!item) return json(res, 404, { error: "not found" });
      item.pinned = !!body.pinned;
      save(items);
      return json(res, 200, item);
    }
    if (req.method === "DELETE" && id) {
      const items = load();
      if (!items.some((i) => i.id === id))
        return json(res, 404, { error: "not found" });
      save(items.filter((i) => i.id !== id));
      return json(res, 200, { ok: true });
    }
    if (req.method === "DELETE" && !id) {
      save([]);
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: "method not allowed" });
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
}

function createServer() {
  return http.createServer(handle);
}

// The API is deliberately unauthenticated: the security boundary is the tunnel
// in front of it (`tailscale serve`), not the service. Binding anywhere but
// loopback throws that boundary away and hands every read and mutation to
// anything that can reach the port, so refuse unless it is asked for by name.
function hostIsAllowed(host, allowAny = process.env.TENFOUR_ALLOW_ANY_HOST) {
  const loopback = ["127.0.0.1", "::1", "localhost"];
  return loopback.includes(host) || allowAny === "1";
}

if (require.main === module) {
  if (!hostIsAllowed(HOST)) {
    console.error(
      `ten-four-shelf: refusing to bind ${HOST}. This API has no authentication ` +
        `and expects a tunnel such as 'tailscale serve' in front of it. Bind ` +
        `127.0.0.1, or set TENFOUR_ALLOW_ANY_HOST=1 if the network is already trusted.`
    );
    process.exit(1);
  }
  createServer().listen(PORT, HOST, () => {
    console.log(`ten-four-shelf on http://${HOST}:${PORT} (store: ${STORE})`);
  });
}

module.exports = { createServer, load, save, sortItems, firstLine, truncate, makeId, hostIsAllowed };
