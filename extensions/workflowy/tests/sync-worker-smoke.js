const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

const ROOT_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const API_KEY = "windows-smoke-test-key";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runWorker(workerPath, dbPath, apiBase, options = {}) {
  return new Promise((resolve, reject) => {
    const workerArguments = options.disableFts5
      ? [
          "--require",
          path.resolve(__dirname, "fixtures", "disable-fts5.js"),
          workerPath,
          "--db",
          dbPath,
        ]
      : [workerPath, "--db", dbPath];
    const child = spawn(process.execPath, workerArguments, {
      env: {
        ...process.env,
        WORKFLOWY_API_BASE: apiBase,
        WORKFLOWY_API_KEY: API_KEY,
        NODE_NO_WARNINGS: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Sync worker timed out after 30 seconds."));
    }, 30_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      const events = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      resolve({ code, events, stdout, stderr });
    });
  });
}

function assertWorkerSucceeded(result, expectedType) {
  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.equal(result.events.at(-1)?.type, expectedType, result.stdout || result.stderr);
}

async function main() {
  const requestedPaths = [];
  const server = http.createServer((request, response) => {
    requestedPaths.push(request.url);

    if (request.headers.authorization !== `Bearer ${API_KEY}`) {
      response.writeHead(401, { "content-type": "text/plain" });
      response.end("Missing test authorization");
      return;
    }

    response.setHeader("content-type", "application/json");
    if (request.url === "/api/v1/nodes-export") {
      response.end(
        JSON.stringify({
          nodes: [
            {
              id: ROOT_ID,
              name: "Root Project",
              note: "Cross-platform root",
              priority: 0,
              createdAt: 1_700_000_000,
              modifiedAt: 1_700_000_100,
            },
            {
              id: CHILD_ID,
              parent_id: ROOT_ID,
              name: "Windows Child #project",
              note: "Portable SQLite @work",
              priority: 1,
              createdAt: 1_700_000_200,
              modifiedAt: 1_700_000_300,
            },
          ],
        }),
      );
      return;
    }

    if (request.url === "/api/v1/targets") {
      response.end(
        JSON.stringify({
          targets: [
            {
              key: "projects",
              node_id: ROOT_ID,
              type: "shortcut",
              label: "<b>Projects</b>",
            },
          ],
        }),
      );
      return;
    }

    response.writeHead(404);
    response.end(JSON.stringify({ error: "Not found" }));
  });

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "workflowy-raycast-smoke-"));
  const databasePath = path.join(tempDirectory, "Windows Path With Spaces", "cache.db");
  const noFtsDatabasePath = path.join(tempDirectory, "No FTS5", "cache.db");
  const workerPath = path.resolve(__dirname, "..", "assets", "sync-worker.js");
  let database = null;

  try {
    await listen(server);
    const address = server.address();
    assert(address && typeof address === "object");
    const apiBase = `http://127.0.0.1:${address.port}`;

    const firstRun = await runWorker(workerPath, databasePath, apiBase);
    assertWorkerSucceeded(firstRun, "done");
    assert.equal(firstRun.events.at(-1).nodeCount, 2);
    assert.deepEqual(requestedPaths, ["/api/v1/nodes-export", "/api/v1/targets"]);

    database = new DatabaseSync(databasePath, { timeout: 5000 });
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM nodes").get().count, 2);
    assert.equal(database.prepare("SELECT path FROM nodes WHERE id = ?").get(CHILD_ID).path, "Root Project > Windows Child #project");
    let searchCount;
    try {
      searchCount = database.prepare("SELECT COUNT(*) AS count FROM nodes_fts WHERE nodes_fts MATCH ?").get("Windows*").count;
    } catch (error) {
      if (!/no such (table|module).*fts5?/i.test(String(error)) && !/nodes_fts/i.test(String(error))) throw error;
      searchCount = database.prepare("SELECT COUNT(*) AS count FROM nodes WHERE LOWER(name) LIKE ?").get("%windows%").count;
    }
    assert.equal(searchCount, 1);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM tags WHERE tag IN (?, ?)").get("#project", "@work").count, 2);
    assert.equal(database.prepare("SELECT label FROM wf_shortcuts WHERE name = ?").get("projects").label, "Projects");
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM wf_shortcuts WHERE is_system = 1").get().count, 4);
    assert.equal(database.prepare("PRAGMA journal_mode").get().journal_mode, "wal");

    database.prepare("UPDATE sync_meta SET value = '0' WHERE key = 'last_export_at'").run();
    const secondRun = await runWorker(workerPath, databasePath, apiBase);
    assertWorkerSucceeded(secondRun, "done");
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM nodes").get().count, 2);
    assert.equal(requestedPaths.length, 4);

    database.close();
    database = null;

    const rateLimitedRun = await runWorker(workerPath, databasePath, apiBase);
    assertWorkerSucceeded(rateLimitedRun, "rate-limit");
    assert.equal(requestedPaths.length, 4);

    const noFtsRun = await runWorker(workerPath, noFtsDatabasePath, apiBase, { disableFts5: true });
    assertWorkerSucceeded(noFtsRun, "done");
    assert.equal(noFtsRun.events.at(-1).nodeCount, 2);
    assert.equal(requestedPaths.length, 6);

    database = new DatabaseSync(noFtsDatabasePath, { timeout: 5000 });
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM nodes").get().count, 2);
    assert.throws(() => database.prepare("SELECT COUNT(*) FROM nodes_fts").get(), /no such table: nodes_fts/i);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM nodes WHERE LOWER(name) LIKE ?").get("%windows%").count, 1);
    database.close();
    database = null;

    console.log(`Sync worker smoke test passed on ${process.platform} (${process.arch}).`);
  } finally {
    if (database) database.close();
    if (server.listening) await closeServer(server);
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
