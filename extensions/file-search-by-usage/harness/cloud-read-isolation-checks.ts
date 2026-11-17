import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { rebuildIndex } from "../src/lib/index-build";
import { openIndexForRead } from "../src/lib/index-db";
import { resolveRoots } from "../src/lib/index-scan";
import { DEFAULT_SETTINGS } from "../src/lib/index-settings";

async function initialResolutionCheck(
  assert: (ok: boolean, label: string) => void,
  source: string,
  target: string,
  local: string,
) {
  const children = Array.from({ length: 32 }, (_, index) =>
    path.join(target, `initial-resolution-${index}`),
  );
  for (const child of children) fs.mkdirSync(child);
  const childPaths = new Set(children);
  const localAlias = `${local}-resolution-alias`;
  fs.symlinkSync(local, localAlias);
  const controllers = children.map(() => new AbortController());
  const localController = new AbortController();
  const originalRealpath = fsp.realpath;
  const releases: (() => void)[] = [];
  let started = 0;
  let ready!: () => void;
  const allStarted = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const watchdog = setTimeout(() => {
    controllers.forEach((controller) => controller.abort());
    ready();
  }, 1500);
  let localTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    fsp.realpath = ((full, ...args: unknown[]) => {
      if (childPaths.has(String(full))) {
        started++;
        return new Promise<string>((resolve) => {
          releases.push(() => resolve(fs.realpathSync(full)));
          if (started === children.length) ready();
        });
      }
      return Reflect.apply(originalRealpath, fsp, [full, ...args]);
    }) as typeof fsp.realpath;
    // Every call knows only the visible automatic source, never its canonical
    // target. Resolve the provider first, then one distinct explicit child.
    const attempts = children.map((child, index) =>
      resolveRoots([source, child], controllers[index].signal, undefined, [
        source,
      ]),
    );
    await allStarted;
    controllers.forEach((controller) => controller.abort());
    await Promise.all(attempts);
    clearTimeout(watchdog);
    localTimer = setTimeout(() => localController.abort(), 300);
    const resolved = await resolveRoots([localAlias], localController.signal);
    assert(
      started === children.length && resolved[0] === local,
      "initial cloud-source resolution isolates explicit child realpath stalls before provenance exists",
    );
  } finally {
    clearTimeout(watchdog);
    clearTimeout(localTimer);
    controllers.forEach((controller) => controller.abort());
    localController.abort();
    fsp.realpath = originalRealpath;
    releases.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** Canonical provider targets outside CloudStorage retain independent read slots. */
export async function cloudReadIsolationChecks(
  assert: (ok: boolean, label: string) => void,
) {
  console.log("\n=== canonical cloud read isolation ===");
  const fixture = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "canonical-cloud-isolation-")),
  );
  const cloudRoot = path.join(fixture, "Library", "CloudStorage");
  const cloudAlias = path.join(fixture, "cloud-alias");
  const target = path.join(fixture, "mounted-provider");
  const nestedTarget = path.join(target, "explicit-child");
  let nestedPaths: string[] = [];
  const readyTarget = path.join(fixture, "other-mounted-provider");
  const local = path.join(fixture, "local");
  const prefixSibling = `${target}-local`;
  const provider = path.join(cloudRoot, `${path.basename(fixture)}-stalled`);
  const file = path.join(fixture, "index.sqlite");
  const originalLstat = fsp.lstat;
  const releases: (() => void)[] = [];
  let stalledReads = 0;
  try {
    for (const folder of [cloudRoot, target, readyTarget, local, prefixSibling])
      fs.mkdirSync(folder, { recursive: true });
    fs.symlinkSync(cloudRoot, cloudAlias);
    fs.symlinkSync(target, provider);
    const stalledPaths = Array.from({ length: 32 }, (_, index) =>
      path.join(target, `slow-${index}.txt`),
    );
    for (const full of stalledPaths) fs.writeFileSync(full, "cloud");
    const localFile = path.join(local, "local-ready.txt");
    const otherFile = path.join(readyTarget, "other-ready.txt");
    const siblingFile = path.join(prefixSibling, "sibling-ready.txt");
    fs.writeFileSync(localFile, "local");
    fs.writeFileSync(otherFile, "other");
    fs.writeFileSync(siblingFile, "sibling");
    await initialResolutionCheck(
      assert,
      path.join(cloudAlias, path.basename(provider)),
      target,
      local,
    );
    fsp.lstat = ((full, ...args: unknown[]) => {
      if (String(full).startsWith(target + path.sep)) {
        stalledReads++;
        return new Promise<fs.Stats>((resolve) => {
          releases.push(() => resolve(fs.lstatSync(full)));
        });
      }
      return Reflect.apply(originalLstat, fsp, [full, ...args]);
    }) as typeof fsp.lstat;

    const build = (roots?: string[], scopes: string[] = []) =>
      rebuildIndex({
        file,
        // Both the cloud parent and its provider may resolve outside the
        // visible path. Routing must follow recorded source ownership.
        cloudRoot: cloudAlias,
        roots,
        withLock: async (work) => work(() => {}),
        lookupFd: () => ({
          kind: "found",
          path: "/synthetic/fd",
          source: "known",
        }),
        loadSettings: async () => ({
          ...DEFAULT_SETTINGS,
          scopes,
          patterns: [],
          includeDrive: true,
        }),
        budgetMs: roots ? 300 : 60,
        tuning: { statConcurrency: 32, batchRows: 32 },
        spawnFd: async function* (args) {
          const root = args.at(-1);
          const paths =
            root === target
              ? stalledPaths
              : root === nestedTarget
                ? nestedPaths
                : root === local
                  ? [localFile]
                  : root === readyTarget
                    ? [otherFile]
                    : root === prefixSibling
                      ? [siblingFile]
                      : [];
          if (paths.length > 0) yield Buffer.from(paths.join("\0") + "\0");
        },
      });

    const first = await build();
    const physicalReads = stalledReads;
    const retry = await build();
    assert(
      first.kind === "done" &&
        !first.report.complete &&
        first.report.roots.some((root) => root.stopped === "time-limit") &&
        retry.kind === "done" &&
        !retry.report.complete &&
        physicalReads > 0 &&
        physicalReads <= 32 &&
        stalledReads === physicalReads,
      "canonical cloud metadata stays bounded and retries share occupied physical slots",
    );

    const localResult = await build([local]);
    assert(
      localResult.kind === "done" &&
        localResult.report.complete &&
        localResult.report.indexed === 1,
      "a stalled external cloud target cannot block a later local rebuild",
    );

    // Exercise direct scan roots too: a visible CloudStorage provider must
    // retain its isolation when no automatic discovery policy was supplied.
    const otherProvider = path.join(
      cloudRoot,
      `${path.basename(fixture)}-ready`,
    );
    fs.symlinkSync(readyTarget, otherProvider);
    const otherResult = await build([otherProvider]);
    assert(
      otherResult.kind === "done" &&
        otherResult.report.complete &&
        otherResult.report.indexed === 1,
      "a stalled external cloud target cannot block another canonical provider",
    );

    const readRows = () => {
      const opened = openIndexForRead(file);
      if (opened.kind !== "opened")
        throw new Error("Fixture index unavailable");
      try {
        return JSON.stringify(
          opened.db
            .prepare("SELECT path, size, scan_id FROM files ORDER BY path")
            .all(),
        );
      } finally {
        opened.db.close();
      }
    };
    const beforeRelease = readRows();
    releases.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
    assert(
      readRows() === beforeRelease,
      "late provider metadata cannot change an index after its timed-out rebuild",
    );

    // Explicit child scopes are walked independently before their provider's
    // parent. They still belong to the same external cloud mount.
    fs.mkdirSync(nestedTarget);
    nestedPaths = Array.from({ length: 32 }, (_, index) =>
      path.join(nestedTarget, `nested-slow-${index}.txt`),
    );
    for (const full of nestedPaths) fs.writeFileSync(full, "nested cloud");
    const beforeNestedReads = stalledReads;
    const nestedResult = await build(undefined, [nestedTarget]);
    const afterNestedLocal = await build([local]);
    assert(
      nestedResult.kind === "done" &&
        !nestedResult.report.complete &&
        stalledReads > beforeNestedReads &&
        afterNestedLocal.kind === "done" &&
        afterNestedLocal.report.complete &&
        afterNestedLocal.report.indexed === 1,
      "an explicit child of a canonical cloud provider cannot consume local read slots",
    );
    const siblingResult = await build([prefixSibling]);
    assert(
      siblingResult.kind === "done" &&
        siblingResult.report.complete &&
        siblingResult.report.indexed === 1,
      "a local sibling sharing a cloud path prefix does not inherit its stalled pool",
    );
  } finally {
    fsp.lstat = originalLstat;
    releases.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}
