import fs from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";
import type { BuildOptions, BuildOutcome } from "../src/lib/index-build";

type Notice = { style: string; title: string; message?: string };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Exercise the real feedback wrapper without a native Raycast worker. */
function loadFeedback(
  build: (options: BuildOptions) => Promise<BuildOutcome>,
  hooks: {
    hide?: () => Promise<void>;
    showFinal?: () => Promise<void>;
  } = {},
) {
  const notices: Notice[] = [];
  const events: string[] = [];
  const modules: Record<string, unknown> = {
    "@raycast/api": {
      environment: { supportPath: "/synthetic-support" },
      getPreferenceValues: () => ({}),
      Toast: {
        Style: { Animated: "animated", Success: "success", Failure: "failure" },
      },
      showToast: async (notice: Notice) => {
        notices.push(notice);
        events.push(`show:${notice.style}`);
        if (notice.style !== "animated") await hooks.showFinal?.();
        return Object.assign(notice, {
          hide: async () => {
            events.push("hide");
            await hooks.hide?.();
            events.push("hidden");
          },
        });
      },
    },
    "./index-db": {
      indexDatabasePath: () => "/synthetic-support/index.sqlite",
    },
    "./index-build": { rebuildIndex: build },
    "./fd-download": {
      ensureFd: () => {
        throw new Error("Unexpected fd lookup");
      },
    },
    "./indexing-lock": {
      withIndexingLock: () => {
        throw new Error("Unexpected lock");
      },
    },
    "./index-settings-store": {
      loadIndexSettingsForRebuild: () => {
        throw new Error("Unexpected settings read");
      },
    },
    "./index-scan": { describeScanProgress: () => "Synthetic progress" },
  };
  const module = {
    exports: {} as { rebuildWithFeedback: () => Promise<void> },
  };
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/index-rebuild.ts"),
    "utf8",
  );
  new Function(
    "require",
    "module",
    "exports",
    transformSync(source, { loader: "ts", format: "cjs" }).code,
  )(
    (id: string) => {
      if (!(id in modules)) throw new Error(`Unexpected import: ${id}`);
      return modules[id];
    },
    module,
    module.exports,
  );
  return { run: module.exports.rebuildWithFeedback, notices, events };
}

export async function rebuildFeedbackChecks(
  assert: (condition: boolean, label: string) => void,
) {
  const complete: BuildOutcome = {
    kind: "done",
    summary: "10 entries indexed.",
    report: {
      roots: [],
      scanned: 10,
      indexed: 10,
      elapsedMs: 20,
      timings: { enumerationMs: 5, metadataMs: 5, databaseMs: 10, ftsMs: 0 },
      complete: true,
      forgotten: [],
    },
  };
  const hiding = deferred();
  const showing = deferred();
  let callbacks: BuildOptions | undefined;
  const app = loadFeedback(
    async (options) => {
      callbacks = options;
      return complete;
    },
    {
      hide: () => hiding.promise,
      showFinal: () => showing.promise,
    },
  );
  let settled = false;
  const running = app.run().then(() => {
    settled = true;
  });
  await tick();
  assert(
    !settled && app.events.join(",") === "show:animated,hide",
    "rebuild waits for the animated notification to hide before showing its outcome",
  );
  hiding.resolve();
  await tick();
  assert(
    !settled &&
      app.events.join(",") === "show:animated,hide,hidden,show:success",
    "rebuild waits for Raycast to acknowledge the final notification before exiting",
  );
  showing.resolve();
  await running;
  const before = JSON.stringify(app.notices);
  callbacks?.onFinishing?.();
  assert(
    JSON.stringify(app.notices) === before,
    "late rebuild feedback cannot resurrect the animated notification",
  );
  assert(
    app.notices[1].title === "Search index rebuilt" &&
      app.notices[1].message === complete.summary,
    "the completed notification includes the scan summary",
  );

  const outcomes: [BuildOutcome, string][] = [
    [
      {
        ...complete,
        report: { ...complete.report, complete: false },
        summary: "Saved paths retained.",
      },
      "Search index partly rebuilt",
    ],
    [
      { kind: "no-fd", message: "Crawler unavailable" },
      "fd is required to build the index",
    ],
    [
      { kind: "no-roots", message: "Choose a scope" },
      "No folders configured for indexing",
    ],
    [
      { kind: "failed", message: "Wait for indexing" },
      "The search index could not be built",
    ],
  ];
  for (const [outcome, title] of outcomes) {
    const test = loadFeedback(async () => outcome);
    await test.run();
    assert(
      test.events.join(",") === "show:animated,hide,hidden,show:failure" &&
        test.notices[1].title === title &&
        test.notices[1].message ===
          (outcome.kind === "done" ? outcome.summary : outcome.message),
      `${outcome.kind} ends the spinner and preserves its outcome message`,
    );
  }
  const rejected = loadFeedback(async () => {
    throw new Error("Synthetic setup failure");
  });
  await rejected.run();
  assert(
    rejected.events.includes("hidden") &&
      rejected.notices[1].style === "failure" &&
      rejected.notices[1].message === "Synthetic setup failure",
    "an unexpected rebuild rejection also ends progress and displays the error",
  );
  const dismissed = loadFeedback(async () => complete, {
    hide: async () => {
      throw new Error("Already dismissed");
    },
  });
  await dismissed.run();
  assert(
    dismissed.notices[1].style === "success",
    "a failed hide request does not suppress the final build outcome",
  );
}
