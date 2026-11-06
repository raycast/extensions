import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";
import { normalizeHost, RokuClient, RokuError, wakeDevice } from "../src/lib/roku";

async function fixture(
  respond: (request: IncomingMessage, response: ServerResponse) => void,
  run: (client: RokuClient, port: number) => Promise<void>,
  timeoutMs = 1000,
) {
  const server = createServer(respond);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await run(new RokuClient("127.0.0.1", { port: address.port, timeoutMs }), address.port);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("accepts plain addresses and rejects URLs, credentials, paths and invalid IPv4", () => {
  assert.equal(normalizeHost(" Living-Room.local "), "living-room.local");
  assert.equal(normalizeHost("192.168.1.20"), "192.168.1.20");
  for (const value of [
    "",
    "http://192.168.1.20",
    "user@roku.local",
    "roku.local:8060",
    "roku.local/keypress/Power",
    "256.1.2.3",
    "12345",
    "-roku.local",
    "roku..local",
    "::1",
  ]) {
    assert.throws(() => normalizeHost(value), RokuError, value);
  }
});

test("preserves serial numbers, decodes names, reads capability flags and old-TV fallbacks", async () => {
  let modern = true;
  await fixture(
    (_req, res) =>
      res.end(
        modern
          ? `<device-info>
    <serial-number>000123</serial-number><user-device-name>Living &amp; Dining</user-device-name>
    <is-tv>true</is-tv><model-name>Roku TV</model-name><software-version>15.2.4</software-version>
    <supports-audio-volume-control>false</supports-audio-volume-control><supports-find-remote>true</supports-find-remote>
    <wifi-mac>aa:bb:cc:dd:ee:ff</wifi-mac><ethernet-mac>aa:bb:cc:dd:ee:ff</ethernet-mac><power-mode>Ready</power-mode><ecp-setting-mode>limited</ecp-setting-mode>
  </device-info>`
          : "<device-info><serial-number>older</serial-number><model-name>Older TV</model-name><is-tv>true</is-tv></device-info>",
      ),
    async (client) => {
      const device = await client.getDeviceInfo();
      assert.equal(device.id, "000123");
      assert.equal(device.name, "Living & Dining");
      assert.equal(device.softwareVersion, "15.2.4");
      assert.equal(device.powerMode, "Ready");
      assert.equal(device.controlMode, "limited");
      assert.deepEqual(device.capabilities, { volume: false, power: true, findRemote: true });
      assert.deepEqual(device.macs, ["aa:bb:cc:dd:ee:ff"]);
      modern = false;
      assert.deepEqual((await client.getDeviceInfo()).capabilities, {
        volume: true,
        power: true,
        findRemote: undefined,
      });
    },
  );
});

test("app lists support zero, one, many and named TV inputs without numeric coercion", async () => {
  let body = "<apps/>";
  await fixture(
    (_req, res) => res.end(body),
    async (client) => {
      assert.deepEqual(await client.getApps(), []);
      body = '<apps><app id="0012" version="1.0" type="appl">A &amp; B</app></apps>';
      assert.deepEqual(await client.getApps(), [{ id: "0012", name: "A & B", type: "appl", version: "1.0" }]);
      body =
        '<apps><app id="0012" type="appl">Video</app><app id="tvinput.hdmi1" type="tvin">Game console</app></apps>';
      const apps = await client.getApps();
      assert.equal(apps.length, 2);
      assert.equal(apps[1].id, "tvinput.hdmi1");
      assert.equal(apps[1].type, "tvin");
    },
  );
});

test("legacy Home is recognized; unknown and malformed responses are not mistaken for Home", async () => {
  let body = "<active-app><app>Roku</app></active-app>";
  await fixture(
    (_req, res) => res.end(body),
    async (client) => {
      assert.deepEqual(await client.getActiveApp(), { id: "home", name: "Roku Home", type: "home" });
      body = "<active-app><app>Unknown state</app></active-app>";
      assert.equal(await client.getActiveApp(), undefined);
      body = "<active-app/>";
      assert.equal(await client.getActiveApp(), undefined);
      body = '<active-app><app id="12" type="appl">Video</app></active-app>';
      assert.equal((await client.getActiveApp())?.id, "12");
      body = "<html><body>Not Roku</body></html>";
      await assert.rejects(client.getDeviceInfo(), { code: "invalid-response" });
      body = "<device-info><is-tv>true</is-tv></device-info>";
      await assert.rejects(client.getDeviceInfo(), { code: "invalid-response" });
      body = "<apps><app>Broken</apps>";
      await assert.rejects(client.getApps(), { code: "invalid-response" });
      body = '<!DOCTYPE apps [<!ENTITY evil "expanded">]><apps>&evil;</apps>';
      await assert.rejects(client.getApps(), { code: "invalid-response" });
    },
  );
});

test("Unicode and reserved characters are encoded and a text sequence cannot interleave with another client", async () => {
  const seen: string[] = [];
  await fixture(
    (req, res) => {
      assert.equal(req.method, "POST");
      seen.push(req.url ?? "");
      setTimeout(() => res.end(), 10);
    },
    async (client, port) => {
      const second = new RokuClient("127.0.0.1", { port });
      await Promise.all([client.sendText("A /😀%"), second.pressKey("VolumeUp"), client.launchApp("tvinput.hdmi1")]);
      assert.deepEqual(seen, [
        "/keypress/Lit_A",
        "/keypress/Lit_%20",
        "/keypress/Lit_%2F",
        "/keypress/Lit_%F0%9F%98%80",
        "/keypress/Lit_%25",
        "/keypress/VolumeUp",
        "/launch/tvinput.hdmi1",
      ]);
    },
  );
});

test("403 produces useful guidance, does not retry a toggle, and does not poison the command queue", async () => {
  const seen: string[] = [];
  await fixture(
    (req, res) => {
      seen.push(req.url ?? "");
      if (req.url === "/keypress/Play") {
        res.statusCode = 403;
        res.end("ECP command not allowed in Limited mode.");
      } else res.end();
    },
    async (client) => {
      const results = await Promise.allSettled([client.pressKey("Play"), client.pressKey("Home")]);
      assert.equal(results[0].status, "rejected");
      if (results[0].status === "rejected") {
        assert.equal(results[0].reason.status, 403);
        assert.match(results[0].reason.message, /Control by mobile apps and select Enabled/);
      }
      assert.equal(results[1].status, "fulfilled");
      assert.deepEqual(seen, ["/keypress/Play", "/keypress/Home"]);
    },
  );
});

test("timeouts include a stalled response body and release the command queue", async () => {
  await fixture(
    (req, res) => {
      if (req.url === "/keypress/Play") {
        res.writeHead(200);
        res.write("partial body");
      } else res.end();
    },
    async (client) => {
      const results = await Promise.allSettled([client.pressKey("Play"), client.pressKey("Home")]);
      assert.equal(results[0].status, "rejected");
      if (results[0].status === "rejected") assert.equal(results[0].reason.code, "timeout");
      assert.equal(results[1].status, "fulfilled");
    },
    80,
  );
});

test("rejects invalid remote keys and app IDs before issuing a request", async () => {
  let requests = 0;
  await fixture(
    (_req, res) => {
      requests++;
      res.end();
    },
    async (client) => {
      await assert.rejects(client.pressKey("Home?x=1"), { code: "invalid-command" });
      await assert.rejects(client.launchApp("../install/12"), { code: "invalid-command" });
      await assert.rejects(client.sendText("x".repeat(1001)), { code: "invalid-command" });
      assert.equal(requests, 0);
    },
  );
});

test("cancelled queued keys and launches are never sent, and later commands still run", { timeout: 3000 }, async () => {
  const seen: string[] = [];
  let releaseFirst: (() => void) | undefined;
  let started: (() => void) | undefined;
  const firstStarted = new Promise<void>((resolve) => { started = resolve; });
  await fixture((req, res) => {
    seen.push(req.url ?? "");
    if (req.url === "/keypress/Home") {
      releaseFirst = () => res.end();
      started?.();
    } else res.end();
  }, async (client, port) => {
    const first = client.pressKey("Home");
    await firstStarted;
    const cancellation = new AbortController();
    const second = new RokuClient("127.0.0.1", { port });
    const results = Promise.allSettled([
      first,
      second.pressKey("VolumeMute", { signal: cancellation.signal }),
      second.launchApp("13", { signal: cancellation.signal }),
      client.pressKey("Back"),
    ]);
    cancellation.abort();
    releaseFirst?.();
    const outcomes = await results;
    assert.deepEqual(outcomes.map((outcome) => outcome.status), ["fulfilled", "rejected", "rejected", "fulfilled"]);
    for (const outcome of outcomes.slice(1, 3)) {
      if (outcome.status === "rejected") assert.equal(outcome.reason.code, "cancelled");
    }
    assert.deepEqual(seen, ["/keypress/Home", "/keypress/Back"]);
  });
});

test("already-cancelled commands and wake requests perform no device writes", async () => {
  let requests = 0;
  const cancellation = new AbortController();
  cancellation.abort();
  await fixture((_req, res) => { requests++; res.end(); }, async (client) => {
    await assert.rejects(client.pressKey("Play", { signal: cancellation.signal }), { code: "cancelled" });
    await assert.rejects(client.launchApp("12", { signal: cancellation.signal }), { code: "cancelled" });
    assert.equal(requests, 0);
  });
  await assert.rejects(wakeDevice({
    id: "test", name: "Test", host: "127.0.0.1", capabilities: {}, macs: ["aa:bb:cc:dd:ee:ff"],
  }, { signal: cancellation.signal }), { code: "cancelled" });
});
