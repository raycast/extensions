import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  chmod,
  open,
  rm,
  access,
  readFile,
  readdir,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Controller } from "../service/controller";
import { paths } from "../service/paths";
import { DEFAULT_CONFIG } from "../service/protocol";
import { ResourceBlock } from "../service/resources";

const MODEL_BYTES = [
  ["embeddinggemma-2-Q8_0.gguf", 309855456],
  ["mmproj-embeddinggemma-2-Q8_0.gguf", 554821024],
] as const;
const WAIT_MS = 6000;

// Sparse models and a synthetic executable exercise real worker ownership without inference or personal data.
async function fixture(
  body: string,
  initialConfig?: string,
  blocked?: ResourceBlock,
) {
  const root = await mkdtemp(join(tmpdir(), "ls-lifecycle-"));
  const locations = paths(join(root, "state"));
  const content = join(root, "docs");
  const marker = join(root, "started");
  await mkdir(content);
  await mkdir(join(locations.base, "bin"), { recursive: true });
  await mkdir(locations.models);
  for (const [name, bytes] of MODEL_BYTES) {
    const file = await open(join(locations.models, name), "w");
    await file.truncate(bytes);
    await file.close();
  }
  await writeFile(
    locations.engine,
    `#!${process.execPath}\nconst marker=${JSON.stringify(marker)};if(process.argv[2]==='resources'){console.log(JSON.stringify({lowPowerMode:false}))}else{${body}}\n`,
  );
  await chmod(locations.engine, 0o755);
  if (initialConfig !== undefined) {
    await writeFile(locations.config, initialConfig);
  }
  const controller = new Controller(locations, async () => blocked);
  await controller.initialize();
  if (initialConfig === undefined) {
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: true,
    });
  }
  return { root, controller, content, marker };
}

// A pause/resume control must not interpret an unreadable saved configuration as an explicit empty scope.
test("corrupt configuration requires recovery before index cleanup", async () => {
  const { root, controller, content, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'pruned');console.log('[]')",
    "{",
  );
  try {
    const status = await controller.status();
    await assert.rejects(
      controller.configure({ ...status.config, paused: false }),
      /configuration.*unavailable/i,
    );
    assert.equal(await readFile(join(root, "state/config.json"), "utf8"), "{");
    await assert.rejects(access(marker), { code: "ENOENT" });
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: true,
    });
    const backups = (await readdir(join(root, "state"))).filter((name) =>
      name.startsWith("config.json.invalid-"),
    );
    assert.equal(backups.length, 1);
    assert.equal(await readFile(join(root, "state", backups[0]), "utf8"), "{");
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Poll only synthetic state; bound failures instead of depending on a fixed sleep.
async function waitFor(check: () => Promise<boolean>) {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }
    await delay(10);
  }
  assert.fail("Synthetic worker did not become ready");
}

// Cleanup failures must survive a restart and retry even while paused and power-blocked.
test("failed empty-scope cleanup survives restart and retries", async () => {
  const { root, controller } = await fixture(
    "const fs=require('node:fs');let attempts=0;try{attempts=Number(fs.readFileSync(marker,'utf8'))}catch{}fs.writeFileSync(marker,String(attempts+1));if(attempts===0){process.exit(1)}console.log('[]')",
  );
  const restarted = new Controller(
    paths(join(root, "state")),
    async () => ResourceBlock.LowPower,
  );
  try {
    const config = (await controller.status()).config;
    await assert.doesNotReject(controller.configure({ ...config, roots: [] }));
    assert.equal(
      JSON.parse(await readFile(join(root, "state/config.json"), "utf8"))
        .clearPending,
      true,
    );
    await controller.close();
    await restarted.initialize();
    await waitFor(
      async () =>
        JSON.parse(await readFile(join(root, "state/config.json"), "utf8"))
          .clearPending === false,
    );
    assert.equal((await restarted.status()).counts?.vectors, 0);
  } finally {
    await controller.close();
    await restarted.close();
    await rm(root, { recursive: true, force: true });
  }
});

// A cleanup retry queued behind a folder save must recheck intent, not restore the old empty scope.
test("queued cleanup preserves newer folder choices", async () => {
  const { root, controller, content, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'pruned');console.log('[]')",
    JSON.stringify({ ...DEFAULT_CONFIG, paused: true, clearPending: true }),
  );
  try {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    Reflect.set(controller, "configQueue", gate);
    const saving = controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: true,
    });
    const retry = Reflect.get(controller, "index").call(controller);
    release();
    await Promise.all([saving, retry]);
    assert.deepEqual((await controller.status()).config.roots, [
      await realpath(content),
    ]);
    await assert.rejects(access(marker), { code: "ENOENT" });
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// The ten-second power poll must not cancel privacy cleanup, which does not load a model.
test(
  "power blocking does not interrupt empty-scope cleanup",
  { timeout: 20000 },
  async () => {
    const { root, controller } = await fixture(
      "setTimeout(()=>console.log('[]'),12000)",
      undefined,
      ResourceBlock.LowPower,
    );
    try {
      await controller.configure({
        ...(await controller.status()).config,
        roots: [],
      });
      assert.equal(
        JSON.parse(await readFile(join(root, "state/config.json"), "utf8"))
          .clearPending,
        false,
      );
      assert.equal((await controller.status()).counts?.vectors, 0);
      assert.equal((await controller.status()).error, undefined);
    } finally {
      await controller.close();
      await rm(root, { recursive: true, force: true });
    }
  },
);

// An in-flight configuration must not create a new cleanup worker or watcher after close.
test("closing drains in-flight configuration without spawning cleanup", async () => {
  const { root, controller, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'started');console.log('[]')",
  );
  try {
    const config = (await controller.status()).config;
    const pending = controller.configure({ ...config, roots: [] });
    const rejected = assert.rejects(pending, /stopping/i);
    await Promise.resolve();
    await controller.close();
    await rejected;
    await assert.rejects(access(marker), { code: "ENOENT" });
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("closing during query readiness never launches a worker", async () => {
  const { root, controller, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'started');setTimeout(()=>console.log('[]'),50)",
  );
  try {
    const pending = controller.search("animals", new AbortController().signal);
    const rejected = assert.rejects(pending, /stopping/i);
    await controller.close();
    await rejected;
    await assert.rejects(access(marker), { code: "ENOENT" });
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Config cancellation must release both the inference slot and its visible searching state.
test("configuration cancellation clears searching activity", async () => {
  const { root, controller, content, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'started');setTimeout(()=>console.log('[]'),10000)",
  );
  try {
    const outcome = controller
      .search("animals", new AbortController().signal)
      .catch((error: unknown) => error);
    await waitFor(() =>
      access(marker).then(
        () => true,
        () => false,
      ),
    );
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: false,
    });
    assert.ok((await outcome) instanceof Error);
    assert.equal((await controller.status()).activity, "idle");
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Replacing indexing settings intentionally stops the old worker; it must not be reported as a run failure.
test("intentional index cancellation does not report an error", async () => {
  const { root, controller, content, marker } = await fixture(
    "require('node:fs').writeFileSync(marker,'index');setTimeout(()=>{},10000)",
  );
  try {
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: false,
    });
    await waitFor(() =>
      access(marker).then(
        () => true,
        () => false,
      ),
    );
    await controller.configure({
      ...(await controller.status()).config,
      memoryLimitMb: 1024,
    });
    assert.equal((await controller.status()).error, undefined);
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Configuring an empty scope while a query yields to indexing must not start an unowned query process.
test("scope changes during worker handoff cancel the pending search", async () => {
  const body =
    "const fs=require('node:fs');if(process.argv[2]==='search'){fs.appendFileSync(marker,'|search');setTimeout(()=>console.log('[]'),200)}else if(process.argv.includes('--backfill')){fs.writeFileSync(marker,'index');process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),100));setInterval(()=>{},1000)}else{fs.appendFileSync(marker,'|prune');console.log('[]')}";
  const { root, controller, content, marker } = await fixture(body);
  try {
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: false,
    });
    await waitFor(() =>
      access(marker).then(
        () => true,
        () => false,
      ),
    );
    const outcome = controller
      .search("animals", new AbortController().signal)
      .catch((error: unknown) => error);
    await controller.configure({
      ...(await controller.status()).config,
      roots: [],
      paused: true,
    });
    assert.ok((await outcome) instanceof Error);
    assert.equal((await readFile(marker, "utf8")).includes("|search"), false);
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Removal/rest-progress events carry a files field, but it is not an index inventory.
test("non-inventory events do not overwrite index counts", async () => {
  const expected = { files: 8, searchable: 7, pending: 1, vectors: 9 };
  const events = [
    { event: "sync", ...expected },
    { event: "pruned", files: 777 },
    { event: "rest", files: 123, done: 1, total: 2 },
    { event: "idle" },
  ];
  const { root, controller, content } = await fixture(
    `for(const event of ${JSON.stringify(events)}){console.log(JSON.stringify(event))}setTimeout(()=>{},10000)`,
  );
  try {
    await controller.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: false,
    });
    await waitFor(async () => (await controller.status()).counts !== undefined);
    assert.deepEqual((await controller.status()).counts, expected);
  } finally {
    await controller.close();
    await rm(root, { recursive: true, force: true });
  }
});
