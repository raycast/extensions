import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rebuildIndex, type BuildOptions } from "../src/lib/index-build";
import { openIndexForRead, openIndexForWrite } from "../src/lib/index-db";
import { queryIndex } from "../src/lib/db-search";
import { DEFAULT_SETTINGS } from "../src/lib/index-settings";
import { parseQuery } from "../src/lib/query";

type Assert = (ok: boolean, label: string) => void;

/** A fixture crawler that respects the scan's anchored ownership exclusions. */
function fixturePaths(args: string[]): string[] {
  const root = args.at(-1)!;
  const excluded = args.flatMap((arg, index) =>
    arg === "--exclude" && args[index + 1]?.startsWith("/")
      ? [args[index + 1].slice(1).replace(/\\(.)/gu, "$1")]
      : [],
  );
  const paths: string[] = [];
  const visit = (folder: string) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      const relative = path.relative(root, full);
      if (
        excluded.some(
          (skip) => relative === skip || relative.startsWith(skip + path.sep),
        )
      )
        continue;
      paths.push(full + (entry.isDirectory() ? path.sep : ""));
      if (entry.isDirectory()) visit(full);
    }
  };
  visit(root);
  return paths;
}

async function* fixtureCrawler(args: string[]): AsyncIterable<Buffer> {
  for (const full of fixturePaths(args)) yield Buffer.from(full + "\0");
}

function fixture() {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "fsbu-cloud-lifecycle-")),
  );
  const cloudRoot = path.join(dir, "CloudStorage");
  const file = path.join(dir, "index.sqlite");
  fs.mkdirSync(cloudRoot);
  const target = (
    name: string,
    names = ["document-one.txt", "document-two.txt"],
  ) => {
    const root = path.join(dir, name);
    fs.mkdirSync(root, { recursive: true });
    for (const name of names)
      fs.writeFileSync(path.join(root, name), "fixture");
    return root;
  };
  const link = (name: string, root?: string) => {
    const source = path.join(cloudRoot, name);
    try {
      fs.unlinkSync(source);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (root !== undefined) fs.symlinkSync(root, source);
    return source;
  };
  const run = (
    overrides: Partial<BuildOptions> = {},
    scopes: string[] = [],
    includeDrive = true,
  ) =>
    rebuildIndex({
      file,
      cloudRoot,
      withLock: async (work) => work(() => {}),
      lookupFd: () => ({ kind: "found", path: "/fixture-fd", source: "known" }),
      loadSettings: async () => ({
        ...DEFAULT_SETTINGS,
        scopes,
        includeDrive,
        patterns: [],
      }),
      spawnFd: fixtureCrawler,
      ...overrides,
    });
  const snapshot = () => {
    const opened = openIndexForRead(file);
    if (opened.kind === "missing")
      return {
        paths: new Set<string>(),
        roots: new Set<string>(),
        owners: new Map<string, string>(),
      };
    if (opened.kind !== "opened") throw new Error(opened.error);
    try {
      return {
        paths: new Set(
          queryIndex(opened.db, parseQuery("document")).entries.map(
            (entry) => entry.path,
          ),
        ),
        roots: new Set(
          (
            opened.db.prepare("SELECT root FROM index_roots").all() as {
              root: string;
            }[]
          ).map((row) => row.root),
        ),
        owners: new Map(
          (
            opened.db.prepare("SELECT path, root FROM files").all() as {
              path: string;
              root: string;
            }[]
          ).map((row) => [row.path, row.root]),
        ),
      };
    } finally {
      opened.db.close();
    }
  };
  return {
    dir,
    file,
    cloudRoot,
    target,
    link,
    run,
    snapshot,
    close: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

async function withFixture(
  work: (test: ReturnType<typeof fixture>) => Promise<void>,
) {
  const test = fixture();
  try {
    await work(test);
  } finally {
    test.close();
  }
}

export async function cloudLifecycleChecks(assert: Assert) {
  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    test.link("Provider", a);
    await test.run();
    test.link("Provider", b);
    const switched = await test.run();
    const saved = test.snapshot();
    assert(
      switched.kind === "done" &&
        switched.report.complete &&
        saved.paths.has(path.join(b, "document-one.txt")) &&
        !saved.paths.has(path.join(a, "document-one.txt")) &&
        !saved.roots.has(a),
      "a completed provider retarget retires the previous canonical root",
    );
  });

  for (const failure of ["partial", "error"] as const) {
    await withFixture(async (test) => {
      const a = test.target("target-a");
      const b = test.target("target-b");
      const local = test.target("local");
      test.link("Provider", a);
      await test.run();
      test.link("Provider", b);
      const incomplete = await test.run(
        failure === "partial"
          ? { maxEntries: 1 }
          : {
              spawnFd: async function* (args) {
                yield Buffer.from(fixturePaths(args)[0] + "\0");
                throw new Error("Synthetic provider failure");
              },
            },
      );
      let saved = test.snapshot();
      assert(
        incomplete.kind === "done" &&
          !incomplete.report.complete &&
          saved.paths.has(path.join(a, "document-one.txt")) &&
          saved.paths.has(path.join(b, "document-one.txt")),
        `a replacement scan with ${failure} results preserves old coverage and committed new rows`,
      );
      test.link("Provider");
      await test.run({}, [local]);
      saved = test.snapshot();
      assert(
        saved.paths.has(path.join(a, "document-one.txt")) &&
          saved.paths.has(path.join(b, "document-one.txt")),
        `a provider vanishing after a replacement with ${failure} results keeps every retained target`,
      );
      test.link("Provider", b);
      await test.run({}, [local]);
      saved = test.snapshot();
      assert(
        !saved.paths.has(path.join(a, "document-one.txt")) &&
          saved.paths.has(path.join(b, "document-two.txt")) &&
          !saved.roots.has(a),
        `a complete retry after a replacement with ${failure} results retires the predecessor`,
      );
    });
  }

  await withFixture(async (test) => {
    const a = test.target("shared-target");
    const b = test.target("replacement");
    test.link("ProviderOne", a);
    test.link("ProviderTwo", a);
    await test.run();
    test.link("ProviderOne", b);
    test.link("ProviderTwo");
    await test.run();
    let saved = test.snapshot();
    assert(
      saved.paths.has(path.join(a, "document-one.txt")) &&
        saved.paths.has(path.join(b, "document-one.txt")),
      "a missing second provider retains its shared target when the first provider retargets",
    );
    test.link("ProviderTwo", b);
    await test.run();
    saved = test.snapshot();
    assert(
      !saved.paths.has(path.join(a, "document-one.txt")) && !saved.roots.has(a),
      "a shared predecessor retires after every owning provider completes its transition",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    const local = test.target("local");
    test.link("Provider", a);
    await test.run();
    test.link("Provider", b);
    let ownershipLost = false;
    const interrupted = await test.run({
      tuning: { batchRows: 1 },
      withLock: async (work) =>
        work(() => {
          if (ownershipLost) throw new Error("Synthetic ownership loss");
        }),
      onProgress: () => {
        ownershipLost = true;
        throw new Error("Synthetic interruption after batch commit");
      },
    });
    const beforeRetry = test.snapshot();
    assert(
      interrupted.kind === "failed" &&
        beforeRetry.owners.has(path.join(b, "document-one.txt")) &&
        !beforeRetry.roots.has(b),
      "an interrupted provider transition can leave a committed batch without root bookkeeping",
    );
    test.link("Provider");
    await test.run({}, [local]);
    const missing = test.snapshot();
    assert(
      [a, b].every((root) =>
        missing.paths.has(path.join(root, "document-one.txt")),
      ),
      "provider provenance survives interruption before root bookkeeping and later disappearance",
    );
    test.link("Provider", b);
    await test.run({}, [local]);
    assert(
      !test.snapshot().paths.has(path.join(a, "document-one.txt")),
      "a completed retry retires the predecessor of an interrupted provider transition",
    );
  });

  await withFixture(async (test) => {
    const direct = test.target("CloudStorage/Provider");
    const replacement = test.target("replacement");
    await test.run();
    fs.renameSync(direct, path.join(test.dir, "former-provider"));
    test.link("Provider", replacement);
    await test.run();
    await test.run();
    const saved = test.snapshot();
    assert(
      saved.paths.has(path.join(replacement, "document-one.txt")) &&
        !saved.paths.has(path.join(direct, "document-one.txt")) &&
        !saved.roots.has(direct),
      "a direct provider becoming a link retires its old root without migration re-adopting it",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    test.link("Provider", a);
    await test.run();
    test.link("Provider", b);
    await test.run({ maxEntries: 1 });
    test.link("Provider", a);
    await test.run();
    const saved = test.snapshot();
    assert(
      saved.paths.has(path.join(a, "document-two.txt")) &&
        !saved.paths.has(path.join(b, "document-one.txt")) &&
        !saved.roots.has(b),
      "returning to the original target retires rows from an abandoned partial replacement",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    const c = test.target("target-c");
    test.link("Provider", a);
    await test.run();
    for (const root of [b, c]) {
      test.link("Provider", root);
      await test.run({ maxEntries: 1 });
    }
    const pending = test.snapshot();
    assert(
      [a, b, c].every((root) =>
        pending.paths.has(path.join(root, "document-one.txt")),
      ),
      "successive partial retargets preserve every prior committed target",
    );
    await test.run();
    const settled = test.snapshot();
    assert(
      settled.paths.has(path.join(c, "document-two.txt")) &&
        [a, b].every(
          (root) => !settled.paths.has(path.join(root, "document-one.txt")),
        ),
      "a completed final target retires all superseded partial targets",
    );
  });

  for (const direction of ["ancestor", "child"] as const) {
    await withFixture(async (test) => {
      const parent = test.target("parent", ["document-parent.txt"]);
      const child = test.target("parent/child", ["document-child.txt"]);
      const [before, after] =
        direction === "ancestor" ? [child, parent] : [parent, child];
      test.link("Provider", before);
      await test.run();
      test.link("Provider", after);
      const result = await test.run();
      const saved = test.snapshot();
      assert(
        result.kind === "done" &&
          result.report.complete &&
          saved.paths.has(path.join(child, "document-child.txt")) &&
          saved.owners.get(path.join(child, "document-child.txt")) === after &&
          saved.paths.has(path.join(parent, "document-parent.txt")) ===
            (after === parent) &&
          !saved.roots.has(before),
        `retargeting to the ${direction} traverses retained paths and assigns their current owner`,
      );
    });
  }

  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    test.link("Provider", a);
    await test.run({}, [a]);
    test.link("Provider", b);
    await test.run({}, [a]);
    assert(
      test.snapshot().paths.has(path.join(a, "document-one.txt")),
      "an explicit scope retains the previous target after an automatic provider retargets",
    );
    await test.run();
    assert(
      !test.snapshot().paths.has(path.join(a, "document-one.txt")),
      "removing that explicit scope does not resurrect retired automatic ownership",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    test.link("Provider", a);
    await test.run();
    await test.run({}, [], false);
    const saved = test.snapshot();
    assert(
      saved.paths.size === 0 && saved.roots.size === 0,
      "disabling cloud inclusion with no explicit scopes clears saved index coverage",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    test.link("Provider", a);
    await test.run();
    fs.writeFileSync(test.link("Provider"), "no longer a directory");
    const removed = await test.run();
    const saved = test.snapshot();
    assert(
      removed.kind === "done" &&
        removed.report.complete &&
        saved.paths.size === 0 &&
        saved.roots.size === 0,
      "a provider proven to be a file retires its old coverage with no other configured scopes",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("shared-target");
    test.link("ProviderOne", a);
    test.link("ProviderTwo", a);
    await test.run();
    const plainFile = path.join(test.dir, "ordinary-file");
    fs.writeFileSync(plainFile, "not a provider directory");
    test.link("ProviderOne", plainFile);
    test.link("ProviderTwo");
    const removed = await test.run();
    const saved = test.snapshot();
    assert(
      removed.kind === "done" &&
        removed.report.complete &&
        saved.paths.has(path.join(a, "document-one.txt")) &&
        saved.roots.has(a),
      "a source becoming a file cannot retire a shared target still owned by an absent provider",
    );
  });

  await withFixture(async (test) => {
    const a = test.target("target-a");
    const b = test.target("target-b");
    test.link("Provider", a);
    await test.run();
    const writer = openIndexForWrite(test.file);
    if (writer.kind !== "opened")
      throw new Error("Could not open cleanup rollback fixture");
    try {
      writer.db.exec(`
        CREATE TRIGGER reject_provider_retirement BEFORE DELETE ON index_roots
        WHEN OLD.root = '${a.replaceAll("'", "''")}'
        BEGIN SELECT RAISE(ABORT, 'Synthetic cleanup failure'); END;
      `);
    } finally {
      writer.db.close();
    }
    test.link("Provider", b);
    const failed = await test.run();
    let saved = test.snapshot();
    assert(
      failed.kind === "failed" &&
        failed.message.includes("Synthetic cleanup failure") &&
        saved.paths.has(path.join(a, "document-one.txt")) &&
        saved.roots.has(a) &&
        saved.paths.has(path.join(b, "document-two.txt")),
      "failed root-record deletion rolls back old file deletion after a replacement scan succeeds",
    );
    const retryWriter = openIndexForWrite(test.file);
    if (retryWriter.kind !== "opened")
      throw new Error("Could not reopen cleanup rollback fixture");
    try {
      retryWriter.db.exec("DROP TRIGGER reject_provider_retirement");
    } finally {
      retryWriter.db.close();
    }
    // A missing source exercises persisted ownership without depending on the
    // private metadata format: rollback must still protect both targets.
    test.link("Provider");
    await test.run();
    saved = test.snapshot();
    assert(
      [a, b].every((root) =>
        saved.paths.has(path.join(root, "document-one.txt")),
      ),
      "failed cleanup retains source ownership when the provider disappears before retry",
    );
    test.link("Provider", b);
    const retried = await test.run();
    saved = test.snapshot();
    assert(
      retried.kind === "done" &&
        retried.report.complete &&
        !saved.paths.has(path.join(a, "document-one.txt")) &&
        !saved.roots.has(a) &&
        saved.paths.has(path.join(b, "document-two.txt")),
      "retrying after the cleanup fault clears retires old data and ownership together",
    );
  });

  await withFixture(async (test) => {
    const legacy = test.target("legacy-target");
    const current = test.target("current-target");
    const local = test.target("local");
    await test.run({ roots: [legacy] });
    const writer = openIndexForWrite(test.file);
    if (writer.kind !== "opened")
      throw new Error("Could not open legacy fixture");
    try {
      writer.db
        .prepare("INSERT INTO index_meta (key, value) VALUES (?, ?)")
        .run(`cloud-root:${legacy}`, legacy);
    } finally {
      writer.db.close();
    }
    test.link("Provider", current);
    await test.run();
    await test.run();
    assert(
      test.snapshot().paths.has(path.join(legacy, "document-one.txt")),
      "migration preserves a legacy automatic root whose provider source is unknown",
    );
    await test.run({}, [local], false);
    const saved = test.snapshot();
    assert(
      !saved.paths.has(path.join(legacy, "document-one.txt")) &&
        !saved.paths.has(path.join(current, "document-one.txt")),
      "disabling cloud inclusion retires conservatively migrated legacy roots",
    );
  });

  await withFixture(async (test) => {
    const legacy = test.target("legacy-shared-target");
    const replacement = test.target("replacement");
    await test.run({ roots: [legacy] });
    const writer = openIndexForWrite(test.file);
    if (writer.kind !== "opened")
      throw new Error("Could not open legacy fixture");
    try {
      writer.db
        .prepare("INSERT INTO index_meta (key, value) VALUES (?, ?)")
        .run(`cloud-root:${legacy}`, legacy);
    } finally {
      writer.db.close();
    }
    // Target-only metadata cannot say whether this is the original provider
    // or a second alias sharing the target while the original is offline.
    test.link("CurrentProvider", legacy);
    await test.run();
    test.link("CurrentProvider", replacement);
    await test.run();
    assert(
      test.snapshot().paths.has(path.join(legacy, "document-one.txt")),
      "a matching live target does not erase unknown legacy provider ownership during migration",
    );
  });
}
