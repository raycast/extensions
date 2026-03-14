import test from "node:test";
import assert from "node:assert/strict";

import { copySelectedFiles } from "./copy-selected-files";

test("copySelectedFiles closes the Raycast window after a successful copy", async () => {
  const calls: string[][] = [];
  let closeOptions:
    | { clearRootSearch: boolean; popToRootType: "immediate" }
    | undefined;
  const toasts: { title: string; message?: string }[] = [];

  await copySelectedFiles({
    displayedItems: [{ path: "/tmp/first.png" }, { path: "/tmp/second.png" }],
    selectedPaths: new Set<string>(["/tmp/second.png"]),
    assetsPath: "/tmp/assets",
    frontmostApp: null,
    execFile: async (file, args) => {
      calls.push([file, ...args]);
    },
    openFilesInApp: async () => undefined,
    showToast: async (options) => {
      toasts.push({ title: options.title, message: options.message });
    },
    closeWindow: async (options) => {
      closeOptions = options;
    },
  });

  assert.deepEqual(calls, [
    ["/tmp/assets/finder-copy-files", "/tmp/second.png"],
  ]);
  assert.deepEqual(closeOptions, {
    clearRootSearch: true,
    popToRootType: "immediate",
  });
  assert.deepEqual(toasts, [
    { title: "Copied like Finder", message: "1 file(s) ready to paste" },
  ]);
});

test("copySelectedFiles routes ChatGPT desktop app through app-open delivery", async () => {
  const opened: { appName: string; filePaths: string[] }[] = [];
  let closeOptions:
    | { clearRootSearch: boolean; popToRootType: "immediate" }
    | undefined;

  await copySelectedFiles({
    displayedItems: [{ path: "/tmp/first.png" }, { path: "/tmp/second.png" }],
    selectedPaths: new Set<string>(["/tmp/first.png", "/tmp/second.png"]),
    assetsPath: "/tmp/assets",
    frontmostApp: {
      bundleId: "com.openai.chat",
      name: "ChatGPT",
    },
    execFile: async () => {
      throw new Error("clipboard helper should not be called");
    },
    openFilesInApp: async (app, filePaths) => {
      opened.push({ appName: app.name, filePaths });
    },
    showToast: async () => undefined,
    closeWindow: async (options) => {
      closeOptions = options;
    },
  });

  assert.deepEqual(opened, [
    {
      appName: "ChatGPT",
      filePaths: ["/tmp/first.png", "/tmp/second.png"],
    },
  ]);
  assert.deepEqual(closeOptions, {
    clearRootSearch: true,
    popToRootType: "immediate",
  });
});

test("copySelectedFiles leaves Codex desktop unsupported and keeps the window open", async () => {
  let execCalled = false;
  let openCalled = false;
  let closeOptions:
    | { clearRootSearch: boolean; popToRootType: "immediate" }
    | undefined;
  const toasts: { style: string; title: string; message?: string }[] = [];

  await copySelectedFiles({
    displayedItems: [{ path: "/tmp/first.png" }, { path: "/tmp/second.png" }],
    selectedPaths: new Set<string>(["/tmp/second.png"]),
    assetsPath: "/tmp/assets",
    frontmostApp: {
      bundleId: "com.openai.codex",
      name: "Codex",
    },
    execFile: async () => {
      execCalled = true;
    },
    openFilesInApp: async () => {
      openCalled = true;
    },
    showToast: async (options) => {
      toasts.push({
        style: options.style,
        title: options.title,
        message: options.message,
      });
    },
    closeWindow: async (options) => {
      closeOptions = options;
    },
  });

  assert.equal(execCalled, false);
  assert.equal(openCalled, false);
  assert.equal(closeOptions, undefined);
  assert.deepEqual(toasts, [
    {
      style: "failure",
      title: "Codex Desktop Not Supported",
      message: "Use Codex web or drag files into the app manually",
    },
  ]);
});

test("copySelectedFiles does not close the window when nothing is selected", async () => {
  let closed = false;

  await copySelectedFiles({
    displayedItems: [{ path: "/tmp/first.png" }],
    selectedPaths: new Set<string>(),
    assetsPath: "/tmp/assets",
    frontmostApp: null,
    execFile: async () => {
      throw new Error("exec should not be called");
    },
    openFilesInApp: async () => undefined,
    showToast: async () => undefined,
    closeWindow: async () => {
      closed = true;
    },
  });

  assert.equal(closed, false);
});
