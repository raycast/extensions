import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  ACTIVE_CONNECTION_KEY,
  CONNECTIONS_KEY,
  activateProfile,
  connectionIdentity,
  loadConnection,
  onConnectionChange,
  parseProfiles,
  recentKey,
  removeProfile,
  saveProfile,
  type SettingsStorage,
} from "./connections.js";
function storage(): SettingsStorage & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  return {
    data,
    async getItem<T extends string>(key: string) {
      return data.get(key) as T | undefined;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}
test("connections verify credentials before activation and store references, never secrets", async () => {
  const directory = await mkdtemp("/tmp/argo-profiles-");
  const token = "a".repeat(64),
    wrong = "b".repeat(64);
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ sessions: [], cursor: 0 }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const privateFile = join(directory, "client.json"),
    badFile = join(directory, "bad.json");
  const settings = storage();
  let changes = 0;
  const unsubscribe = onConnectionChange(() => changes++);
  try {
    await writeFile(privateFile, JSON.stringify({ url: "http://127.0.0.1:1", token }), { mode: 0o600 });
    await writeFile(badFile, JSON.stringify({ url, token: wrong }), { mode: 0o600 });
    const entry = await saveProfile(settings, { name: "Server bridge", configPath: privateFile, url });
    assert.equal(changes, 1);
    assert.equal(settings.data.get(ACTIVE_CONNECTION_KEY), entry.id);
    assert.ok(!JSON.stringify([...settings.data]).includes(token));
    assert.ok(!JSON.stringify([...settings.data]).includes(wrong));
    const loaded = await loadConnection(settings, badFile);
    assert.equal(loaded.config.url, url);
    assert.equal(loaded.profile.name, "Server bridge");
    assert.notEqual(loaded.connectionKey, connectionIdentity({ url, token: wrong }));
    assert.notEqual(loaded.connectionKey, connectionIdentity({ url: "http://127.0.0.1:1", token }));
    assert.ok(!recentKey(loaded.connectionKey).includes(token));
    const original = settings.data.get(CONNECTIONS_KEY);
    await assert.rejects(saveProfile(settings, { name: "Wrong", configPath: badFile, url }));
    assert.equal(settings.data.get(CONNECTIONS_KEY), original);
    assert.equal(settings.data.get(ACTIVE_CONNECTION_KEY), entry.id);
    await assert.rejects(activateProfile(settings, "default", badFile));
    assert.equal(settings.data.get(ACTIVE_CONNECTION_KEY), entry.id);
    await assert.rejects(activateProfile(settings, "missing", privateFile));
    assert.equal(changes, 1, "failed verification never broadcasts a connection change");
    await writeFile(badFile, JSON.stringify({ url, token }), { mode: 0o600 });
    await activateProfile(settings, "default", badFile);
    assert.equal(settings.data.get(ACTIVE_CONNECTION_KEY), undefined);
    await activateProfile(settings, entry.id, badFile);
    await removeProfile(settings, entry.id);
    assert.equal(settings.data.get(ACTIVE_CONNECTION_KEY), undefined);
    assert.deepEqual(parseProfiles(settings.data.get(CONNECTIONS_KEY)), []);
  } finally {
    unsubscribe();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
test("invalid saved metadata never becomes an active public endpoint", () => {
  const item = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Bridge",
    configPath: "/private/client.json",
    url: "http://127.0.0.1:48123",
  };
  assert.deepEqual(parseProfiles(undefined), []);
  for (const raw of [
    "{",
    JSON.stringify({ token: "private" }),
    JSON.stringify([item, item]),
    JSON.stringify([{ ...item, url: "https://public.example" }]),
    JSON.stringify([{ ...item, configPath: "" }]),
  ])
    assert.throws(() => parseProfiles(raw), /Saved bridge settings/);
  assert.deepEqual(parseProfiles(JSON.stringify([{ ...item, token: "ignored" }]))[0], item);
});
