import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function harness(client: any, connect?: () => Promise<any>) {
  const source = ts.createSourceFile(
    "herdr-feed.ts",
    readFileSync(new URL("./herdr-feed.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === "useHerdr")!;
  const states: any[] = [],
    effects: (() => () => void)[] = [];
  let cursor = 0,
    cancelled = 0;
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(declaration.getText(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    {
      exports,
      Error,
      useState(initial: unknown) {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (v: any) => {
            states[i] = typeof v === "function" ? v(states[i]) : v;
          },
        ];
      },
      useRef(initial: unknown) {
        const i = cursor++;
        return states[i] ?? (states[i] = { current: initial });
      },
      useCallback(fn: unknown) {
        return fn;
      },
      useEffect(fn: any) {
        effects.push(fn);
      },
      getPreferenceValues: () => ({ hcSocketPath: "/private/fixture.sock" }),
      HcClient: { connect: connect || (async () => client) },
      hcEntries: (value: any) => value.terminals,
      setTimeout: () => 2,
      clearTimeout: () => {
        cancelled++;
      },
      setInterval: () => 1,
      clearInterval: () => {
        cancelled++;
      },
    },
  );
  return {
    render() {
      cursor = 0;
      return exports.useHerdr();
    },
    start() {
      return effects[0]!();
    },
    cancelled: () => cancelled,
  };
}
test("HC feed coalesces snapshots, preserves stale targets on EOF, and closes both connections", async () => {
  let changed!: () => void,
    failed!: (error: Error) => void,
    closes = 0,
    unsubscribed = 0,
    calls = 0;
  const client = {
    socketPath: "/private/fixture.sock",
    async observe(change: () => void, error: (error: Error) => void) {
      changed = change;
      failed = error;
      return () => {
        unsubscribed++;
      };
    },
    async catalogue() {
      calls++;
      return { core: { name: "fixture" }, terminals: [{ connected: true }] };
    },
    close() {
      closes++;
    },
  };
  const h = harness(client);
  h.render();
  const cleanup = h.start();
  await settle();
  assert.equal(h.render().entries.length, 1);
  assert.equal(calls, 1);
  changed();
  changed();
  assert.equal(calls, 1, "event refresh is debounced");
  failed(new Error("fixture disconnected"));
  assert.equal(h.render().entries[0].connected, false);
  assert.equal(h.render().error, "fixture disconnected");
  cleanup();
  assert.equal(unsubscribed, 1);
  assert.ok(closes >= 1);
  assert.ok(h.cancelled() >= 2);
});
test("closing a feed before socket connection completes ignores late data and closes the new connection", async () => {
  let resolve!: (value: any) => void,
    closes = 0,
    observed = 0;
  const h = harness(
    undefined,
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  h.render();
  const cleanup = h.start();
  cleanup();
  resolve({
    close() {
      closes++;
    },
    observe() {
      observed++;
    },
  });
  await settle();
  assert.equal(closes, 1);
  assert.equal(observed, 0);
  assert.equal(h.render().entries.length, 0);
});

test("a catalogue response that arrives after event EOF cannot resurrect a connected source", async () => {
  let failed!: (error: Error) => void;
  let resolve!: (value: unknown) => void;
  const client = {
    socketPath: "/private/fixture.sock",
    async observe(_change: unknown, error: (error: Error) => void) {
      failed = error;
      return () => {};
    },
    catalogue() {
      return new Promise((done) => {
        resolve = done;
      });
    },
    close() {},
  };
  const h = harness(client);
  h.render();
  const cleanup = h.start();
  await settle();
  failed(new Error("event EOF"));
  resolve({ core: { name: "late" }, terminals: [{ connected: true }] });
  await settle();
  assert.equal(h.render().error, "event EOF");
  assert.equal(h.render().entries.length, 0);
  cleanup();
});
