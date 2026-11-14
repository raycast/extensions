import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync("companion/background.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

test("the same companion identity routes Firefox and Zen to separate native hosts", async () => {
  const hosts: string[] = [];
  for (const info of [{ name: "Firefox" }, { name: "Firefox", zen: { version: "1.24.1b" } }]) {
    vm.runInNewContext(source, {
      browser: {
        runtime: {
          id: "app-hopper-firefox@chenghsj",
          getBrowserInfo: async () => info,
          connectNative: (host: string) => {
            hosts.push(host);
            return { onMessage: { addListener() {} }, onDisconnect: { addListener() {} }, postMessage() {} };
          },
        },
        browserAction: { setBadgeText() {}, onClicked: { addListener() {} } },
      },
      setTimeout,
      clearTimeout,
    });
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(hosts, ["app_hopper.firefox", "app_hopper.zen"]);
});
