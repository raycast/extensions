import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtemp, mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { createService } from "../service/server";
import { LocalClient } from "../service/client";
import { paths } from "../service/paths";
import { DEFAULT_CONFIG, Status } from "../service/protocol";

// A stale UI control must not restore folders replaced by a newer settings save.
test("stale conditional configuration cannot undo newer folder choices", async () => {
  const root = await mkdtemp(join(tmpdir(), "ls-config-race-"));
  const original = join(root, "original");
  const replacement = join(root, "replacement");
  await mkdir(original);
  await mkdir(replacement);
  const service = await createService(paths(join(root, "state")));
  try {
    const first = await call(service.socket, "/config", {
      ...DEFAULT_CONFIG,
      roots: [original],
      paused: true,
    });
    const snapshot = first.body.config;
    const latest = await call(service.socket, "/config", {
      ...snapshot,
      roots: [replacement],
    });
    const stale = await call(service.socket, "/config", {
      ...snapshot,
      paused: false,
      expectedConfig: snapshot,
    });
    assert.equal(stale.status, 409);
    // The form displays the client error verbatim; recovery instructions must name its navigation action.
    await assert.rejects(
      new LocalClient(service.socket).configure(
        { ...snapshot, paused: false },
        snapshot,
      ),
      /reopen Choose Folders and Limits and reapply your edits/,
    );
    assert.deepEqual(
      (await call(service.socket, "/status")).body.config,
      latest.body.config,
    );
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Exercise real Unix-socket HTTP and persistence without running model inference.
async function call(
  socketPath: string,
  route: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Promise<{ status: number; body: Status }>((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path: route,
        method: body === undefined ? "GET" : "POST",
        headers,
      },
      (res) => {
        let output = "";
        res.on("data", (chunk) => {
          output += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(output) });
        });
      },
    );
    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

test("service persists explicit configuration and starts paused safely", async () => {
  const root = await mkdtemp(join(tmpdir(), "local-search-test-"));
  const content = join(root, "content");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(content);
  const service = await createService(paths(join(root, "state")));
  try {
    const status = await call(service.socket, "/status");
    assert.equal(status.status, 200);
    assert.deepEqual(status.body.config.roots, []);
    assert.equal((await stat(service.socket)).mode & 0o777, 0o600);
    const config = { ...DEFAULT_CONFIG, roots: [content], paused: true };
    assert.equal((await call(service.socket, "/config", config)).status, 200);
    assert.equal(
      (await call(service.socket, "/status")).body.config.paused,
      true,
    );
    assert.equal(
      (await stat(join(root, "state/config.json"))).mode & 0o777,
      0o600,
    );
    assert.equal(
      (await call(service.socket, "/search", { query: "lease" })).status,
      503,
    );
    // Pause/resume must remain usable after a selected external folder disappears.
    const current = (await call(service.socket, "/status")).body.config;
    const { rename } = await import("node:fs/promises");
    await rename(content, `${content}-offline`);
    assert.equal(
      (await call(service.socket, "/config", { ...current, paused: false }))
        .status,
      200,
    );
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("service rejects browser origins, unsafe folders, invalid search, and oversized requests", async () => {
  const root = await mkdtemp(join(tmpdir(), "local-search-test-"));
  const service = await createService(paths(root));
  try {
    assert.equal(
      (
        await call(service.socket, "/status", undefined, {
          origin: "https://evil.example",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(service.socket, "/config", {
          ...DEFAULT_CONFIG,
          roots: ["/"],
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(service.socket, "/search", { query: "" })).status,
      400,
    );
    assert.equal(
      (await call(service.socket, "/search", { query: "x".repeat(40000) }))
        .status,
      413,
    );
    assert.equal((await call(service.socket, "/missing")).status, 404);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
