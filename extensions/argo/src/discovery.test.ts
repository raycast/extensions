import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import test from "node:test";
import { clientCodeIdentity, discoverBridge, discoverBridges, pairDiscoveredBridge, portRange } from "./discovery.js";
import { connectionIdentity, loadConnection, saveProfile, type SettingsStorage } from "./connections.js";
import { serverSetupPrompt } from "./server-prompt.js";

test("discovery is bounded, signature verified, credential-free and pairs only a code-pinned identity", async () => {
  const keys = generateKeyPairSync("ed25519"),
    der = keys.publicKey.export({ type: "spki", format: "der" });
  const bridgeId = createHash("sha256").update(der).digest("hex"),
    code = `ARGO-CLIENT-${bridgeId}-${"a".repeat(32)}`,
    token = "b".repeat(64);
  let broken = false,
    claims = 0,
    authCalls = 0;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://localhost");
    if (url.pathname === "/v1/discovery") {
      assert.equal(req.headers.authorization, undefined);
      const challenge = url.searchParams.get("challenge");
      res.end(
        JSON.stringify({
          service: "argo",
          protocol: 1,
          bridgeId,
          publicKey: der.toString("base64"),
          challenge,
          signature: sign(
            null,
            Buffer.from(`argo-discovery-v1\n${broken ? "wrong" : challenge}\n${bridgeId}`),
            keys.privateKey,
          ).toString("base64"),
        }),
      );
    } else if (url.pathname === "/v1/client-pairings/claim") {
      assert.equal(req.headers.authorization, undefined);
      let body = "";
      for await (const chunk of req) body += chunk;
      assert.equal(JSON.parse(body).code, code);
      claims++;
      res.writeHead(201).end(JSON.stringify({ bridgeId, token }));
    } else if (url.pathname === "/v1/sessions") {
      assert.equal(req.headers.authorization, `Bearer ${token}`);
      authCalls++;
      res.end(JSON.stringify({ sessions: [], cursor: 0 }));
    } else res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const directory = await mkdtemp("/tmp/argo-discovery-");
  const data = new Map<string, string>();
  const storage: SettingsStorage = {
    async getItem<T extends string>(k: string) {
      return data.get(k) as T | undefined;
    },
    async setItem(k, v) {
      data.set(k, v);
    },
    async removeItem(k) {
      data.delete(k);
    },
  };
  try {
    assert.deepEqual(
      portRange(),
      Array.from({ length: 20 }, (_, i) => 49120 + i),
    );
    for (const [a, b] of [
      [1, 2],
      [49120, 49119],
      [40000, 40064],
      [65535, 65536],
      ["bad", 49139],
    ])
      assert.throws(() => portRange(a!, b!));
    const target = await discoverBridge(url);
    assert.equal(target.bridgeId, bridgeId);
    assert.equal((await discoverBridges([address.port]))[0]?.bridgeId, bridgeId);
    broken = true;
    await assert.rejects(discoverBridge(url));
    broken = false;
    await assert.rejects(pairDiscoveredBridge(target, `ARGO-CLIENT-${"0".repeat(64)}-${"a".repeat(32)}`, directory));
    assert.equal(claims, 0);
    const path = await pairDiscoveredBridge(target, code, directory);
    assert.equal(claims, 1);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const config = JSON.parse(await readFile(path, "utf8"));
    assert.equal(config.token, token);
    assert.equal(config.bridgeId, bridgeId);
    const profile = await saveProfile(storage, { name: "Test server", configPath: path, url });
    assert.equal(profile.bridgeId, bridgeId);
    assert.ok(!JSON.stringify([...data]).includes(token));
    assert.equal((await loadConnection(storage, undefined, profile.id)).config.bridgeId, bridgeId);
    assert.equal(connectionIdentity(config), connectionIdentity({ ...config, url: "http://127.0.0.1:2" }));
    broken = true;
    await assert.rejects(loadConnection(storage, undefined, profile.id, [address.port]));
    assert.equal(authCalls, 1, "wrong signature never receives stored token");
    assert.equal(clientCodeIdentity(code), bridgeId);
    assert.throws(() => clientCodeIdentity("ARGO-" + "a".repeat(32)));
    assert.match(serverSetupPrompt, /github.com\/MatrixA\/argo\/blob\/[a-f0-9]{40}\/docs\/server-setup.md/);
    assert.match(serverSetupPrompt, /may not be installed/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("server prompt requires a standalone endpoint for forwarding", async () => {
  assert.match(serverSetupPrompt, /standalone.*http:\/\/127\.0\.0\.1:PORT/);
});
