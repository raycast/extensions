import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForBridge(port: number): Promise<Response> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      return await fetch(`http://127.0.0.1:${port}/status`, {
        headers: { Origin: "http://localhost:3000" },
      });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("DOM bridge did not start");
}

test("serves only pages running on loopback origins", async () => {
  const port = await availablePort();
  const directory = mkdtempSync(join(tmpdir(), "agent-feedback-cors-"));
  const bridgePath = new URL("../assets/dom-bridge-server.js", import.meta.url)
    .pathname;
  const scriptPath = new URL("../assets/dom-context.js", import.meta.url)
    .pathname;
  const child = spawn(process.execPath, [
    bridgePath,
    String(port),
    join(directory, "events.jsonl"),
    join(directory, "status.json"),
    scriptPath,
    "test-session-token",
    String(process.pid),
  ]);

  try {
    const localResponse = await waitForBridge(port);
    assert.equal(localResponse.status, 200);
    assert.equal(
      localResponse.headers.get("access-control-allow-origin"),
      "http://localhost:3000",
    );
    assert.equal(
      localResponse.headers.get("access-control-allow-private-network"),
      null,
    );

    for (const origin of ["http://127.0.0.1:5173", "https://[::1]:5173"]) {
      const loopbackResponse = await fetch(`http://127.0.0.1:${port}/status`, {
        headers: { Origin: origin },
      });
      assert.equal(loopbackResponse.status, 200);
      assert.equal(
        loopbackResponse.headers.get("access-control-allow-origin"),
        origin,
      );
    }

    const publicResponse = await fetch(
      `http://127.0.0.1:${port}/agent-feedback.js`,
      { headers: { Origin: "https://example.com" } },
    );
    assert.equal(publicResponse.status, 403);
    assert.equal(
      publicResponse.headers.get("access-control-allow-origin"),
      null,
    );

    const filePageResponse = await fetch(`http://127.0.0.1:${port}/status`, {
      headers: { Origin: "null" },
    });
    assert.equal(filePageResponse.status, 403);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
