import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const build = process.env.DIGUP_TEST_COMMAND;
const require = createRequire(import.meta.url);
const catalogProtocol = 'if(process.argv[2]==="search-service"){require("node:readline").createInterface({input:process.stdin}).on("line",line=>console.log(JSON.stringify({id:JSON.parse(line).id,hits:[],strong:0,meaning:false})));}else ';


function command(t: { after: (fn: () => void) => void }, folders = true) {
  const root = mkdtempSync(join(tmpdir(), "digup-command-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const assets = join(root, "assets"); mkdirSync(assets);
  const binary = join(assets, "digup");
  copyFileSync(fileURLToPath(new URL("fixtures/job.mjs", import.meta.url)), binary);
  chmodSync(binary, 0o755);
  const toasts: Record<string, unknown>[] = [];
  const subtitles: string[] = [];
  let background = false;
  const api = {
    environment: { assetsPath: assets, supportPath: root, launchType: "userInitiated" },
    LaunchType: { Background: "background", UserInitiated: "userInitiated" },
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
    LocalStorage: { getItem: async () => JSON.stringify({ roots: folders ? [root] : [] }) },
    showToast: async (toast: Record<string, unknown>) => {
      if (background) throw new Error("Toast API is not available when command is launched in background");
      toasts.push(toast); return toast;
    },
    updateCommandMetadata: async ({ subtitle }: { subtitle: string }) => { subtitles.push(subtitle); },
  };
  const module = { exports: {} as { default: (props: Record<string, unknown>) => Promise<void> } };
  runInNewContext(`(function(require,module,exports){${readFileSync(build!, "utf8")}\n})`,
    { process, Buffer, setTimeout, clearTimeout, AbortController, Error })
    ((id: string) => id === "@raycast/api" ? api : require(id), module, module.exports);
  return { run: (props: Record<string, unknown>) => {
    background = props.launchType === "background";
    api.environment.launchType = background ? "background" : "userInitiated";
    return module.exports.default(props);
  }, toasts, subtitles, root, binary };
}

test("scheduled updates are quiet and manual updates retain progress", { skip: !build }, async (t) => {
  const cmd = command(t);
  await cmd.run({ launchType: "background" });
  assert.equal(cmd.toasts.length, 0);
  assert.equal(cmd.subtitles.at(-1), "Auto-update every 5 min");
  assert.equal(JSON.parse(readFileSync(join(cmd.root, "index", "last-update.json"), "utf8")).launchType, "background");
  await cmd.run({ launchType: "background", launchContext: { showProgress: true } });
  assert.equal(cmd.toasts.length, 0);
  await cmd.run({ launchType: "userInitiated" });
  assert.equal(cmd.toasts.length, 1);
  assert.equal(cmd.toasts[0].title, "Search Index Updated");
  assert.equal(cmd.toasts[0].style, "success");
});

test("scheduled updates skip unconfigured folders and active jobs", { skip: !build }, async (t) => {
  const empty = command(t, false);
  await empty.run({ launchType: "background" });
  assert.equal(empty.toasts.length, 0);
  assert.equal(empty.subtitles.at(-1), "Choose Search Folders to start");
  const busy = command(t);
  mkdirSync(join(busy.root, "index"));
  writeFileSync(join(busy.root, "index", "indexing.lock"), String(process.pid));
  await busy.run({ launchType: "background" });
  assert.equal(busy.toasts.length, 0);
  assert.equal(busy.subtitles.length, 0);
});

test("scheduled errors reach Raycast and keep a visible failure subtitle", { skip: !build }, async (t) => {
  const cmd = command(t);
  writeFileSync(cmd.binary, '#!/usr/bin/env node\nconsole.log(JSON.stringify({event:"error",message:"Test failure"})); process.exitCode = 1;\n');
  await assert.rejects(cmd.run({ launchType: "background" }), /Test failure/);
  assert.equal(cmd.toasts.length, 0);
  assert.match(cmd.subtitles.at(-1)!, /needs attention/);
});

test("partial indexing is reported instead of marked successful", { skip: !build }, async (t) => {
  const cmd = command(t);
  writeFileSync(cmd.binary, '#!/usr/bin/env node\n' + catalogProtocol + '{console.log(JSON.stringify({event:"summary",states:{failed:1},pending:2}));}\n');
  await assert.rejects(cmd.run({ launchType: "background" }), /failed.*pending/);
  assert.match(cmd.subtitles.at(-1)!, /needs attention/);
});

test("budget pauses preserve pending work, stay quiet and do not claim a complete index", { skip: !build }, async (t) => {
  const cmd = command(t);
  writeFileSync(cmd.binary, '#!/usr/bin/env node\n' + catalogProtocol + '{console.log(JSON.stringify({event:"sync",pending:100})); console.log(JSON.stringify({event:"paused"}));}\n');
  await cmd.run({ launchType: "background" });
  assert.equal(cmd.toasts.length, 0);
  assert.equal(cmd.subtitles.at(-1), "Taking a break · resumes every 5 min");
  const receipt = JSON.parse(readFileSync(join(cmd.root, "index", "last-run.json"), "utf8"));
  assert.equal(receipt.paused, true);
  assert.ok(receipt.peakObservedJSHeapBytes > 0);
  assert.throws(() => readFileSync(join(cmd.root, "index", "last-update.json")), /ENOENT/);
});
