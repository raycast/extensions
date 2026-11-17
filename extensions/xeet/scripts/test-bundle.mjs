// Verify the production distribution without access to the source checkout.
import { build } from "esbuild";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const destination = await mkdtemp(join(tmpdir(), "xeet distribution with spaces-"));
try {
  await cp(resolve(".build/dist"), destination, { recursive: true });
  await build({
    entryPoints: ["tests/bundle-probe.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: join(destination, "probe.cjs"),
    external: ["@raycast/api"],
  });
  await writeFile(
    join(destination, "run.cjs"),
    `
const Module = require('node:module');
const path = require('node:path');
const original = Module._load;
const items = {};
const clipboard = { text: undefined, reads: 0, copied: undefined, failCopy: false };
Module._load = function(name, ...args) {
  if (name === '@raycast/api') return {
    Action: { Style: { Destructive: 'destructive' } },
    environment: { assetsPath: path.join(__dirname, 'assets'), supportPath: path.join(__dirname, 'support'), appearance: 'dark' },
    getPreferenceValues: () => ({ theme: 'system', surface: 'web-timeline', width: '390', dpr: '2', authorName: 'Test User', authorHandle: 'testuser', saveHistory: true, exportDirectory: path.join(__dirname, 'exports') }),
    Clipboard: { readText: async () => { clipboard.reads++; return clipboard.text; }, copy: async value => { if (clipboard.failCopy) throw new Error('Clipboard unavailable'); clipboard.copied = value; } },
    LocalStorage: { allItems: async () => ({...items}), getItem: async key => items[key], setItem: async (key, value) => { items[key] = value; }, removeItem: async key => { delete items[key]; } },
  };
  return original.call(this, name, ...args);
};
globalThis.fetch = async () => { throw new Error('Offline bundle test'); };
require('./probe.cjs').run(__dirname, clipboard).catch(error => { console.error(error); process.exitCode = 1; });
`,
  );
  const output = execFileSync(process.execPath, [join(destination, "run.cjs")], {
    cwd: destination,
    env: {
      ...process.env,
      NODE_PATH: "",
    },
    encoding: "utf8",
  });
  process.stdout.write(output);
} finally {
  await rm(destination, { recursive: true, force: true });
}
