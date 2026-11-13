import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setImmediate, setTimeout } from "node:timers/promises";
import test, { type TestContext } from "node:test";
import {
  presetStorageKey,
  serializeStoredPreset,
  type PromptPreset,
} from "../src/lib/presets.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".js") && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { withPresetStorageLock } =
  await import("../src/lib/preset-storage-lock.ts");

const preset: PromptPreset = {
  id: "preset-id",
  name: "Original",
  template: "Explain {topic}",
  serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
};

const worker = `
import { registerHooks } from 'node:module';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && context.parentURL?.includes('/src/')) {
    return nextResolve(specifier.slice(0, -3) + '.ts', context);
  }
  return nextResolve(specifier, context);
} });
const base = process.env.MULTI_AI_TEST_BASE;
const mode = process.env.MULTI_AI_TEST_MODE;
const source = (file) => pathToFileURL(join(process.cwd(), 'src/lib', file)).href;
const lockDirectory = join(base, 'local.lock');
const { withPresetStorageLock } = await import(source('preset-storage-lock.ts'));
if (mode === 'hold') {
  process.on('message', () => {});
  await withPresetStorageLock(lockDirectory, async () => {
    process.send({ type: 'locked' });
    await new Promise(() => {});
  });
} else {
  const { synchronizePresetsWithICloud } = await import(source('icloud-preset-sync.ts'));
  const { upsertPreset } = await import(source('preset-storage.ts'));
  const localFile = join(base, 'local.json');
  const read = async () => JSON.parse(await readFile(localFile, 'utf8'));
  let paused = false;
  const storage = {
    allItems: read,
    getItem: async (key) => (await read())[key],
    setItem: async (key, value) => {
      if (mode === 'sync' && !paused && typeof value === 'string' && JSON.parse(value).name === 'Cloud revision') {
        paused = true;
        process.send({ type: 'paused' });
        await new Promise((resolve) => process.once('message', resolve));
      }
      const items = await read();
      items[key] = value;
      const temporary = localFile + '.' + randomUUID();
      await writeFile(temporary, JSON.stringify(items));
      await rename(temporary, localFile);
    },
    removeItem: async (key) => {
      const items = await read();
      delete items[key];
      const temporary = localFile + '.' + randomUUID();
      await writeFile(temporary, JSON.stringify(items));
      await rename(temporary, localFile);
    },
  };
  const options = {
    lockDirectory, now: () => 300,
    synchronize: (local) => synchronizePresetsWithICloud(local, {
      directory: join(base, 'cloud'), lockDirectory, now: () => 300,
    }),
    onSyncError: (error) => { throw error; },
  };
  process.send({ type: 'started' });
  if (mode === 'sync') await options.synchronize(storage);
  else await upsertPreset({
    id: 'preset-id', name: 'Acknowledged edit', template: 'Explain {topic}',
    serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
  }, storage, options);
  process.send({ type: 'done' });
  process.disconnect();
}
`;

function startWorker(t: TestContext, base: string, mode: string) {
  const child = spawn(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      "--input-type=module",
      "-e",
      worker,
    ],
    {
      env: {
        ...process.env,
        MULTI_AI_TEST_BASE: base,
        MULTI_AI_TEST_MODE: mode,
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    },
  );
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  });
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  const messages = new Set<string>();
  const waiters = new Map<string, () => void>();
  child.on("message", (message) => {
    const type = (message as { type: string }).type;
    messages.add(type);
    waiters.get(type)?.();
  });
  const exit = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code && !signal)
        reject(new Error(`Worker failed (${code}): ${stderr}`));
      else resolve({ code, signal });
    });
  });
  // Install rejection handling immediately, including while waiting for a gate.
  void exit.catch(() => {});
  const message = (type: string) =>
    messages.has(type)
      ? Promise.resolve()
      : Promise.race([
          new Promise<void>((resolve) => {
            waiters.set(type, resolve);
          }),
          exit.then(() => {
            throw new Error(`Worker exited before ${type}: ${stderr}`);
          }),
        ]);
  return { child, messages, message, exit };
}

async function directory(t: TestContext) {
  const base = await mkdtemp(join(tmpdir(), "multi-ai-chat-process-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  return base;
}

async function waitForContender(base: string) {
  const deadline = performance.now() + 2_000;
  while (
    !(await readdir(base)).some((name) => name.startsWith("local.lock.owner-"))
  ) {
    assert.ok(
      performance.now() < deadline,
      "save process never reached the lock",
    );
    await setTimeout(5);
  }
}

test(
  "separate command processes serialize a stale sync and a save",
  { timeout: 10_000 },
  async (t) => {
    const base = await directory(t);
    await mkdir(join(base, "cloud"));
    await writeFile(
      join(base, "local.json"),
      JSON.stringify({
        [presetStorageKey(preset.id)]: serializeStoredPreset(preset, 100),
      }),
    );
    await writeFile(
      join(base, "cloud", "preset-id.json"),
      JSON.stringify({
        version: 1,
        id: preset.id,
        updatedAt: 200,
        preset: { ...preset, name: "Cloud revision" },
      }),
    );
    const syncing = startWorker(t, base, "sync");
    await syncing.message("paused");
    const saving = startWorker(t, base, "save");
    await saving.message("started");
    await waitForContender(base);
    assert.equal(saving.messages.has("done"), false);
    syncing.child.send("resume");
    await Promise.all([syncing.exit, saving.exit]);
    const items = JSON.parse(await readFile(join(base, "local.json"), "utf8"));
    const local = JSON.parse(items[presetStorageKey(preset.id)]);
    const remote = JSON.parse(
      await readFile(join(base, "cloud", "preset-id.json"), "utf8"),
    );
    assert.equal(local.name, "Acknowledged edit");
    assert.equal(local.updatedAt, 300);
    assert.equal(remote.preset.name, "Acknowledged edit");
    assert.equal(remote.updatedAt, 300);
  },
);

test(
  "a command recovers a lock left by a killed process",
  { timeout: 10_000 },
  async (t) => {
    const base = await directory(t);
    const holder = startWorker(t, base, "hold");
    await holder.message("locked");
    holder.child.kill("SIGKILL");
    assert.equal((await holder.exit).signal, "SIGKILL");
    let entered = false;
    await withPresetStorageLock(join(base, "local.lock"), async () => {
      entered = true;
    });
    assert.equal(entered, true);
    await assert.rejects(readFile(join(base, "local.lock")), {
      code: "ENOENT",
    });
  },
);

test(
  "multiple contenders can recover the same abandoned owner without releasing each other's lock",
  { timeout: 10_000 },
  async (t) => {
    const base = await directory(t);
    const holder = startWorker(t, base, "hold");
    await holder.message("locked");
    holder.child.kill("SIGKILL");
    await holder.exit;
    let active = 0;
    let completed = 0;
    await Promise.all(
      Array.from({ length: 12 }, () =>
        withPresetStorageLock(join(base, "local.lock"), async () => {
          assert.equal(++active, 1);
          await setImmediate();
          active--;
          completed++;
        }),
      ),
    );
    assert.equal(completed, 12);
  },
);
