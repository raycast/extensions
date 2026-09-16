import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { once } from "node:events";
import { ContainerRow } from "../src/model";
import {
  localContainerClient,
  stopWithClient,
  ContainerRequest,
} from "../src/container-control";

const expected: ContainerRow = {
  id: "a".repeat(64),
  startedAt: "2026-09-16T01:00:00Z",
  name: "fixture",
  status: "running",
  stopSignal: "SIGTERM",
  memory: 0,
  cpuPercent: 0,
  readBytes: 0,
  writeBytes: 0,
};
const info = (
  startedAt = expected.startedAt,
  running = true,
  stopSignal = "SIGTERM",
) => ({
  status: 200,
  body: JSON.stringify({
    Id: expected.id,
    State: { StartedAt: startedAt, Running: running },
    Config: { StopSignal: stopSignal },
  }),
});

test("stale container is rejected at the final inspection before dispatch", async () => {
  const requests: string[] = [];
  const send: ContainerRequest = async (method, path) => {
    requests.push(`${method} ${path}`);
    return info("replacement-start");
  };
  await assert.rejects(stopWithClient(expected, false, send), /restarted/);
  await assert.rejects(stopWithClient(expected, true, send), /restarted/);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((r) => r.startsWith("GET ")));
});

test("a restart during stopping is reported and never triggers another stop", async () => {
  const requests: string[] = [];
  const send: ContainerRequest = async (method, path) => {
    requests.push(`${method} ${path}`);
    if (method === "POST") return { status: 204, body: "" };
    return info(
      requests.length === 1 ? expected.startedAt : "replacement-start",
    );
  };
  await assert.rejects(stopWithClient(expected, false, send), /restarted/);
  assert.equal(requests.filter((r) => r.startsWith("POST")).length, 1);
  assert.ok(requests[1].endsWith("/stop?t=-1"));
});

test("container success requires observation, and configured kill needs explicit force", async () => {
  let posts = 0;
  const send: ContainerRequest = async (method) => {
    if (method === "POST") {
      posts++;
      return { status: 204, body: "" };
    }
    return info(); // Even a successful request is not evidence of exit.
  };
  assert.equal(await stopWithClient(expected, false, send), "requested");
  assert.equal(posts, 1);
  await assert.rejects(
    stopWithClient(expected, false, async () =>
      info(expected.startedAt, true, "SIGKILL"),
    ),
    /Force Stop/,
  );
  assert.equal(
    await stopWithClient(expected, false, async () => ({
      status: 404,
      body: "",
    })),
    "exited",
  );
  await assert.rejects(
    stopWithClient(expected, false, async () => ({ status: 200, body: "{}" })),
    /could not be verified/,
  );
});

test("local socket timeout leaves graceful stop pending; force is a separate request", async () => {
  // A short /tmp path avoids Unix socket name length limits on macOS.
  const directory = await mkdtemp("/tmp/ri-docker-");
  const socket = join(directory, "docker.sock");
  const requests: string[] = [];
  let running = true;
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.method === "GET") res.end(info(expected.startedAt, running).body);
    else if (req.url?.endsWith("/kill?signal=KILL")) {
      running = false;
      res.writeHead(204).end();
    }
    // Graceful stop deliberately never responds, just as with a TERM-ignoring target.
  });
  server.listen(socket);
  await once(server, "listening");
  const client = localContainerClient(socket);
  try {
    assert.equal(
      await stopWithClient(expected, false, client.send, 30),
      "requested",
    );
    assert.equal(running, true);
    assert.equal(
      requests.some((r) => r.includes("kill")),
      false,
    );
    assert.equal(await stopWithClient(expected, true, client.send), "exited");
    assert.deepEqual(
      requests.filter((r) => r.startsWith("POST")),
      [
        `POST /containers/${expected.id}/stop?t=-1`,
        `POST /containers/${expected.id}/kill?signal=KILL`,
      ],
    );
  } finally {
    client.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
