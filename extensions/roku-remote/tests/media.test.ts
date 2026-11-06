import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import test from "node:test";
import { RokuClient, RokuError } from "../src/lib/roku";

async function withServer(
  respond: (request: IncomingMessage) => { status?: number; body: string | Buffer },
  run: (client: RokuClient, seen: string[]) => Promise<void>,
) {
  const seen: string[] = [];
  const server = createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`);
    const { status = 200, body } = respond(req);
    res.statusCode = status;
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await run(new RokuClient("127.0.0.1", { port: address.port, timeoutMs: 1000 }), seen);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("parses media-player state, position and duration", async () => {
  await withServer(
    () => ({
      body: `<?xml version="1.0" encoding="UTF-8" ?>
<player error="false" state="play">
  <plugin bandwidth="25000000 bps" id="12" name="Netflix"/>
  <format audio="eac3" captions="none" drm="widevine" video="hevc"/>
  <position>754123 ms</position>
  <duration>3600000 ms</duration>
  <is_live>false</is_live>
</player>`,
    }),
    async (client) => {
      const player = await client.getMediaPlayer();
      assert.deepEqual(player, {
        state: "play",
        error: false,
        appId: "12",
        appName: "Netflix",
        positionMs: 754123,
        durationMs: 3600000,
        isLive: false,
      });
    },
  );
});

test("media-player without a plugin (Home screen) still returns a state", async () => {
  await withServer(
    () => ({ body: `<player error="false" state="close"/>` }),
    async (client) => {
      const player = await client.getMediaPlayer();
      assert.equal(player?.state, "close");
      assert.equal(player?.appId, undefined);
      assert.equal(player?.positionMs, undefined);
    },
  );
});

test("search posts an encoded keyword and optional launch flag", async () => {
  await withServer(
    () => ({ body: "" }),
    async (client, seen) => {
      await client.search("  The Office & Friends ");
      await client.search("Dune", { launch: true });
      assert.deepEqual(seen, [
        "POST /search/browse?keyword=The+Office+%26+Friends",
        "POST /search/browse?keyword=Dune&launch=true",
      ]);
      await assert.rejects(client.search("   "), RokuError);
    },
  );
});

test("downloads icons and rejects unsafe app IDs", async () => {
  await withServer(
    () => ({ body: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }),
    async (client, seen) => {
      const bytes = await client.getIcon("tvinput.hdmi1");
      assert.equal(bytes.length, 4);
      assert.deepEqual(seen, ["GET /query/icon/tvinput.hdmi1"]);
      await assert.rejects(client.getIcon("../etc"), RokuError);
    },
  );
});

test("text is sent as ordered literal keypresses", async () => {
  await withServer(
    () => ({ body: "" }),
    async (client, seen) => {
      await client.sendText("a b&");
      assert.deepEqual(seen, [
        "POST /keypress/Lit_a",
        "POST /keypress/Lit_%20",
        "POST /keypress/Lit_b",
        "POST /keypress/Lit_%26",
      ]);
    },
  );
});
