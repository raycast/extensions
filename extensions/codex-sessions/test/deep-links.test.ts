import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn((...args: unknown[]) => {
    const callback = args.at(-1);
    if (typeof callback === "function") callback(null, "", "");
  }),
  getApplications: vi.fn(),
  open: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getApplications: mocks.getApplications,
  getPreferenceValues: vi.fn(() => ({})),
  open: mocks.open,
  showToast: mocks.showToast,
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({
  executeSQL: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mocks.execFile,
}));

import {
  newTaskDeepLink,
  openNewThreadInProject,
  openWorkspace,
  threadDeepLink,
  type NewTaskTarget,
} from "../src/lib/open-codex";

describe("Codex deep links", () => {
  it("encodes spaces and Japanese thread IDs", () => {
    expect(threadDeepLink("thread id 日本語")).toBe("codex://threads/thread%20id%20%E6%97%A5%E6%9C%AC%E8%AA%9E");
  });

  it("encodes a path target and preserves its decoded value", () => {
    const path = "/Users/test/日本語 project/with spaces";
    const link = newTaskDeepLink({ path });

    expect(link).toMatch(/^codex:\/\/new\?path=/);
    expect(link).toContain("%E6%97%A5%E6%9C%AC%E8%AA%9E");
    expect(link).toContain("+");
    expect(new URL(link).searchParams.get("path")).toBe(path);
  });

  it("supports an origin URL target independently of a path", () => {
    const originUrl = "https://github.com/example/日本語 repo";
    const link = newTaskDeepLink({ originUrl });

    expect(new URL(link).searchParams.get("originUrl")).toBe(originUrl);
  });

  it("rejects an ambiguous path and origin URL combination", () => {
    const target = {
      path: "/tmp/project",
      originUrl: "https://github.com/example/project",
    } as unknown as NewTaskTarget;
    expect(() => newTaskDeepLink(target)).toThrow("Exactly one path or origin URL is required");
  });

  it("rejects a target with neither path nor origin URL", () => {
    expect(() => newTaskDeepLink({} as NewTaskTarget)).toThrow("Exactly one path or origin URL is required");
  });

  it("opens an existing workspace by its exact path only", async () => {
    mocks.getApplications.mockResolvedValue([{ bundleId: "com.openai.codex" }]);

    await openWorkspace("/tmp/chosen-project");

    const openedUrl = mocks.open.mock.calls.at(-1)?.[0] as string;
    const params = new URL(openedUrl).searchParams;
    expect(params.get("path")).toBe("/tmp/chosen-project");
    expect(params.has("originUrl")).toBe(false);
  });
});

describe("new thread in the selected project", () => {
  let projectPath: string;

  beforeEach(() => {
    projectPath = mkdtempSync(join(tmpdir(), "codex 日本語 O'Brien-"));
    mocks.open.mockClear();
    mocks.showToast.mockClear();
    mocks.getApplications.mockResolvedValue([{ bundleId: "com.openai.codex" }]);
  });

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
  });

  it("opens the new-thread composer with the exact selected project path", async () => {
    expect(await openNewThreadInProject(projectPath)).toBe(true);

    expect(mocks.open).toHaveBeenCalledTimes(1);
    const url = new URL(mocks.open.mock.calls[0][0] as string);
    expect(url.host).toBe("new");
    expect(url.searchParams.get("path")).toBe(projectPath);
    expect(url.searchParams.has("originUrl")).toBe(false);
  });

  it("does not open another project when the selected folder is missing", async () => {
    expect(await openNewThreadInProject(join(projectPath, "missing"))).toBe(false);
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Project folder is unavailable" }));
  });

  it("rejects a path that is a file instead of a project folder", async () => {
    const file = join(projectPath, "file.txt");
    writeFileSync(file, "test");

    expect(await openNewThreadInProject(file)).toBe(false);
    expect(mocks.open).not.toHaveBeenCalled();
  });
});
