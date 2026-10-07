import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { transformSync } from "esbuild";
import {
  openIndexForWrite,
  openIndexForRead,
  readIndexRoots,
  suspendFtsSync,
  writeScanStarted,
  writeScanEnded,
  writeScanError,
} from "../src/lib/index-db";
import { rebuildIndex, BuildOptions } from "../src/lib/index-build";
import {
  readScanMessages,
  scanMessageMarkdown,
  scanMessageText,
  ScanMessages,
} from "../src/lib/scan-messages";

export function scanMessageChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scan-messages-"));
  const file = path.join(directory, "index.sqlite");
  try {
    assert(
      readScanMessages(file).status === "missing" && !fs.existsSync(file),
      "reading missing scan messages does not create an index",
    );
    const opened = openIndexForWrite(file);
    if (opened.kind !== "opened")
      throw new Error("Cannot create synthetic diagnostic index");
    try {
      const insert = opened.db.prepare(
        "INSERT INTO index_roots (root, scanned_at, complete, files, note) VALUES (?, ?, ?, 0, ?)",
      );
      insert.run(
        "/example/cloud",
        1000,
        0,
        "A linked folder is unavailable; saved paths were kept.",
      );
      insert.run("/example/healthy", 1000, 1, null);
      insert.run("/example/partial", 1000, 0, null);
      let saved = readScanMessages(file);
      assert(
        saved.status === "ready" &&
          saved.messages.length === 2 &&
          saved.messages[0].root === "/example/cloud" &&
          saved.messages[0].recordedAt === 1000,
        "existing per-folder warnings retain their scope and timestamp without another rebuild",
      );
      assert(
        saved.messages[1].message.includes("partly scanned"),
        "partial folders without a note still have an explanation",
      );
      writeScanStarted(opened.db, 2000);
      suspendFtsSync(opened.db);
      saved = readScanMessages(file);
      assert(
        saved.unfinished === true && saved.messages.length === 2,
        "diagnostics remain readable while FTS is suspended, and previous folder warnings retain their dates",
      );
      writeScanError(opened.db, "Synthetic scan failure");
      writeScanEnded(opened.db, 2000, 3000);
      saved = readScanMessages(file);
      assert(
        saved.unfinished === false &&
          saved.messages[0].message === "Synthetic scan failure" &&
          saved.messages[0].recordedAt === 3000,
        "a finished failed scan retains its build error alongside folder warnings",
      );
      writeScanStarted(opened.db, 4000);
      assert(
        !readScanMessages(file).messages.some(
          (item) => item.id === "build-error",
        ),
        "a new scan clears the previous overall error without clearing folder warnings",
      );
      opened.db
        .prepare(
          "UPDATE index_roots SET complete = 1, note = NULL WHERE root = ?",
        )
        .run("/example/cloud");
      assert(
        readScanMessages(file).messages.length === 1,
        "a successful folder retry replaces its old warning",
      );
      const item = {
        id: "format",
        root: "/example/[folder]",
        message: "<script>\n```\n# fd diagnostic",
      };
      assert(
        scanMessageText(item).includes(item.root) &&
          scanMessageText(item).includes(item.message),
        "copyable diagnostics include the full path and message",
      );
      assert(
        scanMessageMarkdown(item)
          .split("\n")
          .every((line) => line.startsWith("    ")),
        "diagnostic paths and output are rendered literally, not as Markdown links or markup",
      );
      opened.db.exec("DROP TABLE index_scan_outcomes");
      assert(
        readScanMessages(file).messages.length === 1,
        "older indexes without the diagnostics table still expose saved coverage notes",
      );
      opened.db.exec("DROP TABLE index_roots");
      assert(
        readScanMessages(file).status === "failed",
        "a diagnostic read error is not presented as a clean scan",
      );
    } finally {
      opened.db.close();
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export async function scanOutcomeChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "scan-outcomes-")),
  );
  const file = path.join(directory, "index.sqlite");
  const known = path.join(directory, "known");
  const fresh = path.join(directory, "fresh");
  const healthy = path.join(directory, "healthy");
  const snapshot = () => {
    const opened = openIndexForRead(file);
    if (opened.kind !== "opened") throw new Error("Synthetic index unreadable");
    try {
      return {
        roots: readIndexRoots(opened.db),
        files: opened.db.prepare("SELECT * FROM files ORDER BY path").all(),
      };
    } finally {
      opened.db.close();
    }
  };
  const build = (options: Partial<BuildOptions> = {}) =>
    rebuildIndex({
      file,
      roots: [known],
      withLock: async (work) => work(() => {}),
      lookupFd: () => ({
        kind: "found",
        path: "/synthetic/fd",
        source: "path",
      }),
      spawnFd: async function* () {
        yield Buffer.from(`${path.join(known, "report.txt")}\0`);
      },
      ...options,
    });
  try {
    fs.mkdirSync(known);
    fs.mkdirSync(healthy);
    fs.writeFileSync(path.join(known, "report.txt"), "synthetic");
    const first = await build();
    assert(
      first.kind === "done" && first.report.complete,
      "diagnostic regression starts with complete saved coverage",
    );
    const before = snapshot();
    fs.renameSync(known, `${known}-offline`);
    const missing = await build({
      roots: [known, fresh, healthy],
      spawnFd: async function* () {},
    });
    const after = snapshot();
    const warnings = readScanMessages(file).messages;
    assert(
      missing.kind === "done" &&
        !missing.report.complete &&
        [known, fresh].every((root) =>
          warnings.some(
            (item) =>
              item.root === root && item.message.includes("unavailable"),
          ),
        ),
      "unavailable known and never-indexed folders both retain warnings after rebuild completion",
    );
    assert(
      JSON.stringify(after.files) === JSON.stringify(before.files) &&
        JSON.stringify(after.roots.find((root) => root.root === known)) ===
          JSON.stringify(before.roots[0]) &&
        !after.roots.some((root) => root.root === fresh),
      "offline diagnostics do not replace coverage records or erase retained file rows",
    );
    const timed = await build({ roots: [known, fresh, healthy], budgetMs: -1 });
    assert(
      timed.kind === "done" &&
        !timed.report.complete &&
        readScanMessages(file).messages.length === 3 &&
        readScanMessages(file).messages.every((item) =>
          item.message.includes("time limit"),
        ),
      "every deadline-skipped root gets a saved time-limit warning, superseding the earlier diagnostic",
    );
    assert(
      JSON.stringify(snapshot()) === JSON.stringify(after),
      "deadline-skipped diagnostics leave all saved coverage unchanged",
    );
    const cancelled = await build({
      roots: [known, fresh],
      signal: AbortSignal.abort(),
    });
    assert(
      cancelled.kind === "done" &&
        !cancelled.report.complete &&
        readScanMessages(file).messages.length === 2 &&
        readScanMessages(file).messages.every((item) =>
          item.message.includes("Cancelled"),
        ),
      "cancellation before scanning persists per-folder warnings rather than a clean status",
    );
    fs.renameSync(`${known}-offline`, known);
    const retry = await build();
    assert(
      retry.kind === "done" &&
        retry.report.complete &&
        readScanMessages(file).messages.length === 0,
      "a successful retry replaces warnings, and removed scopes leave no obsolete diagnostic",
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export async function scanMessageViewChecks(
  assert: (ok: boolean, label: string) => void,
) {
  let saved: ScanMessages = {
    status: "ready",
    messages: [
      {
        id: "cloud",
        root: "/example/cloud",
        recordedAt: 1000,
        message: "Synthetic linked folder warning",
      },
    ],
  };
  let refresh: (() => void) | undefined;
  let intervalMs = 0;
  let cleared = false;
  const module = {
    exports: {} as typeof import("../src/components/index-scan-messages"),
  };
  const api = {
    List: { Section: "section", Item: "item" },
    Icon: {},
    ActionPanel: "actions",
    Action: { Push: "push", CopyToClipboard: "copy" },
    Detail: "detail",
  };
  new Function(
    "require",
    "module",
    "exports",
    "React",
    "setInterval",
    "clearInterval",
    transformSync(
      fs.readFileSync("src/components/index-scan-messages.tsx", "utf8"),
      { loader: "tsx", format: "cjs", jsxFactory: "React.createElement" },
    ).code,
  )(
    (id: string) => {
      if (id === "react") return React;
      if (id === "@raycast/api") return api;
      if (id === "../lib/scan-messages")
        return {
          readScanMessages: () => saved,
          scanMessageMarkdown,
          scanMessageText,
        };
      if (id === "../lib/read-dir")
        return { displayPath: (value: string) => value };
      throw new Error(`Unexpected import ${id}`);
    },
    module,
    module.exports,
    React,
    (callback: () => void, ms: number) => {
      refresh = callback;
      intervalMs = ms;
      return 1;
    },
    (timer: number) => {
      cleared = timer === 1;
    },
  );
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(
        React.createElement(module.exports.IndexScanMessages, {
          file: "/example/index.sqlite",
        }),
      );
    });
    const row = renderer!.root.findByProps({ title: "/example/cloud" });
    const actions = row.props.actions.props.children;
    assert(
      row.props.subtitle === saved.messages[0].message &&
        actions[0].props.title === "View Full Message" &&
        actions[1].props.content.includes(saved.messages[0].message),
      "Settings renders the saved warning with full-message and copy actions",
    );
    saved = { status: "ready", messages: [] };
    await act(() => refresh?.());
    assert(
      intervalMs === 3000 &&
        renderer!.root.findAllByProps({ title: "/example/cloud" }).length ===
          0 &&
        renderer!.root.findAllByProps({ title: "No saved scan warnings" })
          .length === 1,
      "Settings refreshes messages in place after a successful rescan",
    );
  } finally {
    await act(() => renderer?.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
  assert(cleared, "closing Settings stops scan-message polling");
}
