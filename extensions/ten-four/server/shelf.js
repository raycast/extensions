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
const { execFileSync } = require("child_process");
const { timingSafeEqual } = require("crypto");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const STORE =
  process.env.TENFOUR_FILE || path.join(os.homedir(), ".ten-four.json");
const LOCK = `${STORE}.lock`;
const LOCK_STALE_MS = 2000;
const PID_ONLY_STALE_MS = 30000;
const PORT = Number(process.env.PORT || process.env.TENFOUR_PORT || 7801);
const HOST = process.env.TENFOUR_HOST || "127.0.0.1";
const AUTH_TOKEN = process.env.TENFOUR_TOKEN || "";
const MAX_ITEMS = 200;

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeStore(items) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  // Write then rename, which is atomic within a directory, so a reader never
  // catches a half-written store. Rename does not serialize read-modify-write
  // across processes: a local-mode CLI or Raycast mutation can load the same
  // snapshot and rename over us. withLock covers that whole mutation.
  const tmp = `${STORE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, STORE);
}

function processStartTime(pid) {
  try {
    return (
      execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

function lockToken() {
  const startedAt = processStartTime(process.pid);
  return JSON.stringify({
    pid: process.pid,
    fingerprint: startedAt !== null,
    // Keep a live owner safe when `ps` is temporarily unavailable. A later
    // writer can still reclaim this lock if the PID is no longer alive.
    pidOnly: startedAt === null,
    startedAt,
    token: Math.random().toString(36).slice(2),
  });
}

function lockOwner(token) {
  try {
    const { pid, fingerprint, pidOnly, startedAt } = JSON.parse(token);
    if (Number.isInteger(pid) && pid > 0) {
      return {
        pid,
        fingerprint: fingerprint === true,
        pidOnly: pidOnly === true,
        startedAt: typeof startedAt === "string" ? startedAt : null,
      };
    }
  } catch {
    // Locks written before ownership fingerprints used the PID prefix only.
  }
  return {
    pid: Number(token.split("-", 1)[0]),
    fingerprint: false,
    pidOnly: false,
    startedAt: null,
  };
}

async function withLock(fn) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  for (;;) {
    try {
      const fd = fs.openSync(LOCK, "wx");
      const token = lockToken();
      fs.writeFileSync(fd, token);
      let parsed = {};
      try {
        parsed = JSON.parse(token);
      } catch {
        // ignore malformed self-written token
      }
      let heartbeat;
      if (parsed.pidOnly) {
        const touch = () => {
          try {
            fs.utimesSync(LOCK, new Date(), new Date());
          } catch {
            // lock released
          }
        };
        heartbeat = setInterval(touch, PID_ONLY_STALE_MS / 3);
      }
      try {
        return fn();
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        fs.closeSync(fd);
        try {
          if (fs.readFileSync(LOCK, "utf8") === token) fs.unlinkSync(LOCK);
        } catch {
          // already released
        }
      }
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - fs.statSync(LOCK).mtimeMs > LOCK_STALE_MS) {
          const lockStat = fs.statSync(LOCK);
          const token = fs.readFileSync(LOCK, "utf8");
          const owner = lockOwner(token);
          let ownerAlive = false;
          if (owner.pidOnly) {
            ownerAlive =
              Date.now() - fs.statSync(LOCK).mtimeMs <= PID_ONLY_STALE_MS;
          } else if (Number.isInteger(owner.pid) && owner.pid > 0) {
            try {
              process.kill(owner.pid, 0);
              ownerAlive =
                owner.fingerprint &&
                typeof owner.startedAt === "string" &&
                processStartTime(owner.pid) === owner.startedAt;
            } catch (error) {
              ownerAlive =
                error.code === "EPERM" &&
                owner.fingerprint &&
                typeof owner.startedAt === "string" &&
                processStartTime(owner.pid) === owner.startedAt;
            }
          }
          if (!ownerAlive) {
            try {
              const currentStat = fs.statSync(LOCK);
              if (
                currentStat.mtimeMs === lockStat.mtimeMs &&
                fs.readFileSync(LOCK, "utf8") === token
              ) {
                fs.unlinkSync(LOCK);
              }
            } catch {
              // lock vanished or a successor acquired it
            }
          }
        }
      } catch {
        // lock vanished or we raced with the holder releasing it
      }
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

function save(items) {
  writeStore(items);
}

async function modify(fn) {
  return withLock(() => {
    const items = fn(load());
    writeStore(items);
    return items;
  });
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}

function firstLine(text, max = 60) {
  const line =
    text
      .replace(/\r/g, "")
      .split("\n")
      .find((l) => l.trim()) || text;
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

function requestIsAuthorized(req) {
  const authorization = req.headers.authorization;
  if (
    !AUTH_TOKEN ||
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return false;
  }
  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(AUTH_TOKEN);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

async function handle(req, res) {
  if (!requestIsAuthorized(req)) {
    return json(res, 401, { error: "unauthorized" });
  }
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
      await modify((items) => truncate([item, ...items]));
      return json(res, 201, item);
    }
    if (req.method === "PATCH" && id) {
      const body = JSON.parse((await readBody(req)) || "{}");
      let missing = false;
      let found = null;
      await modify((items) => {
        const item = items.find((i) => i.id === id);
        if (!item) {
          missing = true;
          return items;
        }
        item.pinned = !!body.pinned;
        found = item;
        return items;
      });
      if (missing) return json(res, 404, { error: "not found" });
      return json(res, 200, found);
    }
    if (req.method === "DELETE" && id) {
      let missing = false;
      await modify((items) => {
        if (!items.some((i) => i.id === id)) {
          missing = true;
          return items;
        }
        return items.filter((i) => i.id !== id);
      });
      if (missing) return json(res, 404, { error: "not found" });
      return json(res, 200, { ok: true });
    }
    if (req.method === "DELETE" && !id) {
      await modify(() => []);
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

// The token protects the loopback listener from other local processes. Binding
// anywhere but loopback still exposes the service to the network, so refuse
// unless an operator has explicitly opted in.
function hostIsAllowed(host, allowAny = process.env.TENFOUR_ALLOW_ANY_HOST) {
  const loopback = ["127.0.0.1", "::1", "localhost"];
  return loopback.includes(host) || allowAny === "1";
}

if (require.main === module) {
  if (!AUTH_TOKEN) {
    console.error(
      "ten-four-shelf: TENFOUR_TOKEN is required to protect the local API.",
    );
    process.exit(1);
  }
  if (!hostIsAllowed(HOST)) {
    console.error(
      `ten-four-shelf: refusing to bind ${HOST}. Bind 127.0.0.1 and expose it ` +
        `with a tunnel such as 'tailscale serve', or set TENFOUR_ALLOW_ANY_HOST=1 ` +
        `if the network is already trusted.`,
    );
    process.exit(1);
  }
  createServer().listen(PORT, HOST, () => {
    console.log(`ten-four-shelf on http://${HOST}:${PORT} (store: ${STORE})`);
  });
}

module.exports = {
  createServer,
  load,
  save,
  modify,
  sortItems,
  firstLine,
  truncate,
  makeId,
  hostIsAllowed,
  requestIsAuthorized,
};
