import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import vm from "node:vm";
import firefoxManifest from "../companion/manifest.json";

for (const id of ["firefox", "zen"]) {
  const manifest = firefoxManifest;

  test(`${id} packaging alias produces the shared companion package`, async () => {
    const root = path.resolve(__dirname, "..");
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/package-companion.ts", ...(id === "zen" ? ["--zen"] : [])],
      { cwd: root },
    );
    const archive = path.join(root, "dist/companion", `app-hopper-companion-${manifest.version}.zip`);
    const entries = execFileSync("/usr/bin/unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
    assert.deepEqual(entries.sort(), ["background.js", "manifest.json"]);
    const packagedManifest = JSON.parse(
      execFileSync("/usr/bin/unzip", ["-p", archive, "manifest.json"], { encoding: "utf8" }),
    );
    assert.deepEqual(packagedManifest, manifest);
    const background = execFileSync("/usr/bin/unzip", ["-p", archive, "background.js"], { encoding: "utf8" });
    const ready: unknown[] = [];
    let connections = 0;
    vm.runInNewContext(background, {
      browser: {
        runtime: {
          id: manifest.browser_specific_settings.gecko.id,
          getBrowserInfo: async () => ({ name: "Firefox", ...(id === "zen" ? { zen: { version: "1.24" } } : {}) }),
          connectNative: (host: string) => {
            assert.equal(host, `app_hopper.${id}`);
            connections++;
            return {
              onMessage: { addListener() {} },
              onDisconnect: { addListener() {} },
              postMessage: (message: unknown) => ready.push(JSON.parse(JSON.stringify(message))),
            };
          },
        },
        browserAction: { onClicked: { addListener() {} }, setBadgeText() {} },
      },
      setTimeout,
      clearTimeout,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(connections, 1);
    assert.deepEqual(ready, [{ ready: true }]);
  });
}
