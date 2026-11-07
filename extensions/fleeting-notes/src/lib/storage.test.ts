import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { transpileModule, ModuleKind } from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_TEXT_BYTES, ScratchpadStore, appendText, parseState } from "./storage";

const directories: string[] = [];
function makeStore() {
  const directory = mkdtempSync(join(tmpdir(), "fleeting-notes-test-"));
  directories.push(directory);
  return new ScratchpadStore(directory);
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("scratchpad persistence", () => {
  it("persists Unicode, newlines, and the latest character before returning", () => {
    const store = makeStore();
    let state = store.read();
    for (const text of ["a", "ab", "ab\n", "ab\n📝 é 中文"]) {
      state = store.save(text, state.revision);
      // A new instance models reopening after the editor worker has exited.
      expect(new ScratchpadStore(store.directory).read().current.text).toBe(text);
    }
    expect(state.revision).toBe(4);
    expect(statSync(store.path).mode & 0o777).toBe(0o600);
  });

  it("preserves one previous pad and swaps without losing the active pad", () => {
    const store = makeStore();
    const original = store.save("original", 0);
    const fresh = store.startNew(original.revision);
    expect(fresh.current.text).toBe("");
    expect(fresh.previous?.text).toBe("original");
    const second = store.save("second", fresh.revision);
    const restored = store.restorePrevious(second.revision);
    expect(restored.current.text).toBe("original");
    expect(restored.previous?.text).toBe("second");
    const swapped = store.restorePrevious(restored.revision);
    expect(swapped.current.text).toBe("second");
    expect(new ScratchpadStore(store.directory).read()).toEqual(swapped);
  });

  it("does not discard the previous pad when starting from an empty scratchpad", () => {
    const store = makeStore();
    const first = store.startNew(store.save("keep me", 0).revision);
    const second = store.startNew(first.revision);
    expect(second).toEqual(first);
    expect(store.save("", second.revision)).toEqual(first);
  });

  it("rejects stale editor writes instead of overwriting newer content", () => {
    const store = makeStore();
    store.save("newer", 0);
    expect(() => store.save("stale", 0)).toThrow("changed in another command");
    expect(store.read().current.text).toBe("newer");
    expect(store.save("retry after reload", 1).current.text).toBe("retry after reload");
  });

  it("leaves malformed or future-format data untouched", () => {
    const store = makeStore();
    for (const raw of ["truncated{", '{"version":2}', '{"version":1,"revision":-1}']) {
      writeFileSync(store.path, raw);
      expect(() => store.read()).toThrow();
      expect(() => store.save("replacement", 0)).toThrow();
      expect(readFileSync(store.path, "utf8")).toBe(raw);
    }
    expect(() => parseState('{"version":1,"revision":0,"current":{"text":"x","updatedAt":null}}')).toThrow();
  });

  it("rejects oversized notes before modifying the saved pad", () => {
    const store = makeStore();
    store.save("existing", 0);
    expect(() => store.save("📝".repeat(MAX_TEXT_BYTES / 4 + 1), 1)).toThrow("limited to 1 MB");
    expect(store.read().current.text).toBe("existing");
  });

  it("retains data on an active lock and recovers an incomplete abandoned lock", () => {
    const store = makeStore();
    store.save("existing", 0);
    const lock = join(store.directory, "scratchpad.lock");
    writeFileSync(lock, String(process.pid));
    expect(() => store.save("blocked", 1)).toThrow("save is in progress");
    expect(store.read().current.text).toBe("existing");
    writeFileSync(lock, "");
    const old = new Date(Date.now() - 60_000);
    utimesSync(lock, old, old);
    expect(store.save("recovered", 1).current.text).toBe("recovered");
  });

  it("preserves the saved file when a write cannot acquire its lock", () => {
    const store = makeStore();
    store.save("original", 0);
    const blockedStore = new ScratchpadStore(join(store.path, "not-a-directory"));
    expect(() => blockedStore.save("new", 0)).toThrow();
    expect(store.read().current.text).toBe("original");
  });

  it("fails closed on an abandoned coordination gate", () => {
    const store = makeStore();
    store.save("keep me", 0);
    writeFileSync(join(store.directory, "scratchpad.lock.gate"), "");
    expect(() => store.save("replacement", 1)).toThrow("quit Raycast");
    expect(store.read().current.text).toBe("keep me");
  });

  it("allows only one synchronized writer to recover an abandoned save lock", async () => {
    const store = makeStore();
    const compiledPath = join(store.directory, "storage.cjs");
    writeFileSync(
      compiledPath,
      transpileModule(readFileSync(join(__dirname, "storage.ts"), "utf8"), {
        compilerOptions: { module: ModuleKind.CommonJS },
      }).outputText,
    );
    for (let run = 0; run < 20; run++) {
      writeFileSync(
        store.path,
        JSON.stringify({ version: 1, revision: 0, current: { text: "original", updatedAt: null }, previous: null }),
      );
      writeFileSync(join(store.directory, "scratchpad.lock"), "999999999");
      const barrier = new SharedArrayBuffer(4);
      let ready = 0;
      const results = await Promise.all(
        ["first", "second"].map(
          (text) =>
            new Promise<{ saved: boolean; text: string }>((resolve, reject) => {
              const worker = new Worker(
                `const {parentPort,workerData}=require('node:worker_threads');
                 const {ScratchpadStore}=require(workerData.compiledPath);
                 const barrier=new Int32Array(workerData.barrier);
                 parentPort.postMessage('ready');
                 Atomics.wait(barrier,0,0);
                 try {new ScratchpadStore(workerData.directory).save(workerData.text,0);
                   parentPort.postMessage({saved:true,text:workerData.text});}
                 catch {parentPort.postMessage({saved:false,text:workerData.text});}`,
                { eval: true, workerData: { compiledPath, directory: store.directory, barrier, text } },
              );
              worker.on("error", reject);
              worker.on("message", (message) => {
                if (message === "ready") {
                  if (++ready === 2) {
                    Atomics.store(new Int32Array(barrier), 0, 1);
                    Atomics.notify(new Int32Array(barrier), 0);
                  }
                } else {
                  resolve(message);
                }
              });
            }),
        ),
      );
      const successful = results.filter((result) => result.saved);
      expect(successful).toHaveLength(1);
      expect(store.read().current.text).toBe(successful[0].text);
      expect(store.read().revision).toBe(1);
    }
  });
});

describe("clipboard appending", () => {
  it("keeps multiline text intact and separates appends with one newline", () => {
    expect(appendText("", "📝\nsecond")).toBe("📝\nsecond");
    expect(appendText("first", "second")).toBe("first\nsecond");
    expect(appendText("first\n", "second")).toBe("first\nsecond");
    expect(appendText("keep", "")).toBe("keep");
  });
});
