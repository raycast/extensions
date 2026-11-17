import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BlipClient,
  BlipNotInstalledError,
  BlipNotRunningError,
  BlipNotSignedInError,
  shortReason,
} from "../src/lib/client";
import { DrpcTimeoutError, encodeFrame, FrameKind, FrameParser } from "../src/lib/drpc";
import { encode } from "../src/lib/schema";

const signedIn = { version: 1, auth: { user_id: "me", device_id: "mac" } };
// Node can only serve named pipes on Windows (the real Blip socket there goes through the bridge).
const socketPath = () =>
  process.platform === "win32"
    ? `\\\\.\\pipe\\blip-test-${randomUUID()}`
    : join(mkdtempSync(join(tmpdir(), "blip-")), "sock");

/** A fake Blip engine on a Unix socket that answers every GetState with `state`. */
function fakeBlip(path: string, state: Record<string, unknown> = signedIn) {
  const server = createServer((socket) => {
    const parser = new FrameParser();
    socket.on("data", (chunk: Buffer) => {
      for (const frame of parser.push(chunk)) {
        if (frame.kind !== FrameKind.CloseSend) continue;
        const body = encode("rpc.BinaryStateResponse", { id: 7, state: encode("frontend.State", state) });
        socket.write(
          Buffer.concat([
            encodeFrame(FrameKind.Message, 1, 1, Buffer.from(body)),
            encodeFrame(FrameKind.CloseSend, 1, 2, Buffer.alloc(0)),
          ]),
        );
      }
    });
  });
  return new Promise<Server>((resolve) => server.listen(path, () => resolve(server)));
}

const close = (server: Server) => new Promise((resolve) => server.close(resolve));

test("after Blip has answered once, a quit Blip is reported, not restarted", async () => {
  const path = socketPath();
  const server = await fakeBlip(path);
  let launches = 0;
  const client = new BlipClient({ endpoint: path, launch: async () => void launches++ });
  assert.equal((await client.getState()).state.auth?.user_id, "me");
  await close(server);
  await assert.rejects(client.getState(), BlipNotRunningError);
  assert.equal(launches, 0);
});

test("when Blip isn't running, it's started once, even for concurrent first calls", async () => {
  const path = socketPath();
  const servers: Server[] = [];
  let launches = 0;
  const client = new BlipClient({
    endpoint: path,
    launch: async () => {
      launches++;
      servers.push(await fakeBlip(path));
    },
  });
  const [a, b] = await Promise.all([client.getState(), client.getState()]);
  assert.equal(a.state.auth?.user_id, "me");
  assert.equal(b.state.auth?.user_id, "me");
  assert.equal(launches, 1);
  await Promise.all(servers.map(close));
});

test("a failed launch isn't retried in a loop, but opening Blip by hand still recovers", async () => {
  const path = socketPath();
  let launches = 0;
  const client = new BlipClient({
    endpoint: path,
    launch: async () => {
      launches++;
      throw new Error("no such app");
    },
  });
  await assert.rejects(client.getState(), BlipNotInstalledError);
  await assert.rejects(client.getState(), BlipNotInstalledError);
  assert.equal(launches, 1);
  // The user installs and opens Blip themselves.
  const server = await fakeBlip(path);
  assert.equal((await client.getState()).state.auth?.user_id, "me");
  await close(server);
});

test("a signed-out Blip is reported as such", async () => {
  const path = socketPath();
  const server = await fakeBlip(path, { version: 1 });
  await assert.rejects(new BlipClient({ endpoint: path }).getState(), BlipNotSignedInError);
  await close(server);
});

test("HUD reasons are short and never raw protocol text", () => {
  assert.equal(shortReason(new DrpcTimeoutError("/rpc.Service/Dispatch")), "Blip isn't responding");
  assert.equal(shortReason(new BlipNotSignedInError()), "sign in to Blip");
  assert.equal(shortReason(new Error("Not found: /a/very/long/path/that/would/not/fit.txt")), "file not found");
  assert.ok(shortReason(new Error("x".repeat(200))).length <= 60);
});
