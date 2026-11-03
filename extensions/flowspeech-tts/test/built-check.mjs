import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { host, loadBuilt, records, closeViews, invoke } from "./host-fixture.mjs";
import { job, json, wav } from "./fixtures.mjs";

let directory, originalFetch;
beforeEach(async () => {
  await mkdir(".test-tmp", { recursive: true });
  directory = await mkdtemp(path.resolve(".test-tmp/built-"));
  Object.assign(host, {
    supportPath: path.join(directory, "audio"),
    storage: {},
    storageFile: undefined,
    storageError: false,
    toasts: [],
    copied: [],
    played: [],
    selected: "Built selected text",
    clipboard: "Built clipboard text",
    onToast: undefined,
    playbackError: undefined,
    holdPlayback: false,
    preferences: { apiKey: "test-key", voiceName: "Kore" },
  });
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Unexpected network");
  };
});
afterEach(async () => {
  await closeViews();
  globalThis.fetch = originalFetch;
  await rm(directory, { recursive: true, force: true });
});
for (const name of ["speak-selected", "speak-copied"]) {
  test("distribution " + name + " runs the persisted-ID, verified-WAV playback path", async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url, init });
      if (init.method === "POST") {
        assert.equal(records()[0].requestId, init.headers["Idempotency-Key"]);
        assert.equal(records()[0].state, "pending");
        return json(job("success", { requestId: init.headers["Idempotency-Key"] }));
      }
      assert.equal(init.headers, undefined);
      return new Response(wav);
    };
    await loadBuilt(name)();
    assert.equal(calls.length, 2);
    assert.equal(records()[0].state, "completed");
    assert.deepEqual(host.played[0].audio, wav);
    assert.deepEqual(await readdir(host.supportPath), []);
  });
}
test("distribution stop action retains UUID and does not call server cancellation", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(job("queued", { requestId: init.headers["Idempotency-Key"] }), 202);
  };
  const running = loadBuilt("speak-selected")();
  for (let i = 0; i < 100 && calls.length === 0; i++) await delay(5);
  assert.equal(calls.length, 1);
  await invoke(host.views.at(-1), "Stop Waiting");
  await running;
  assert.equal(records()[0].state, "interrupted");
  assert.ok(host.toasts.at(-1).message.includes(records()[0].requestId));
  assert.equal(calls.length, 1);
  await loadBuilt("show-recovery")();
  await invoke(host.recoveryView, "Copy All Recovery IDs");
  assert.ok(host.copied[0].includes(records()[0].requestId));
  assert.equal(calls.length, 1);
});
for (const malformed of ["metadata", "WAV"]) {
  test("distribution rejects malformed " + malformed + " without playback", async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url, init });
      if (init.method === "POST") {
        const body = job("success", { requestId: init.headers["Idempotency-Key"] });
        if (malformed === "metadata") delete body.result.access;
        return json(body);
      }
      return new Response("RIFF\x04\x00\x00\x00WAVE");
    };
    await loadBuilt("speak-copied")();
    assert.equal(host.played.length, 0);
    assert.equal(records()[0].state, "interrupted");
    assert.equal(calls.length, malformed === "metadata" ? 1 : 2);
  });
}
test("distribution refuses API redirects without forwarding credentials", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 302, headers: { Location: "https://untrusted.example.test" } });
  };
  await loadBuilt("speak-selected")();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(host.played.length, 0);
});
test("distribution inventory, source maps, icon and secret scan match the intended artifact", async () => {
  const manifest = JSON.parse(await readFile(".build/package.json", "utf8"));
  assert.deepEqual(
    manifest.commands.map((command) => command.name),
    ["speak-selected", "speak-copied", "show-recovery"],
  );
  assert.ok(manifest.commands.every((command) => command.mode === "view"));
  const expected = [
    "assets",
    "package.json",
    ...manifest.commands.flatMap((command) => [command.name + ".js", command.name + ".js.map"]),
  ];
  assert.deepEqual((await readdir(".build")).sort(), expected.sort());
  assert.deepEqual(await readFile(".build/assets/extension-icon.png"), await readFile("assets/extension-icon.png"));
  for (const command of manifest.commands) {
    const map = JSON.parse(await readFile(".build/" + command.name + ".js.map", "utf8"));
    for (let index = 0; index < map.sources.length; index++) {
      const source = path.resolve(".build", map.sources[index]);
      const runtimeDependency = path.relative(path.resolve("node_modules"), source).split(path.sep)[0];
      assert.ok(
        source.startsWith(path.resolve("src") + path.sep) ||
          (source.startsWith(path.resolve("node_modules") + path.sep) &&
            ["proper-lockfile", "graceful-fs", "retry"].includes(runtimeDependency)),
      );
      assert.equal(map.sourcesContent[index], await readFile(source, "utf8"));
    }
    for (const extension of [".js", ".js.map"]) {
      const content = await readFile(".build/" + command.name + extension, "utf8");
      assert.doesNotMatch(
        content,
        /(?:test-key|react-test-renderer|\/Users\/|\/private\/var\/folders\/|gh[pousr]_[A-Za-z0-9]{25,}|npm_[A-Za-z0-9]{25,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/,
      );
    }
  }
});
