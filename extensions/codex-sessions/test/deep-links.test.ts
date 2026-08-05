import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn((...args: unknown[]) => {
    const callback = args.at(-1);
    if (typeof callback === "function") callback(null, "", "");
  }),
  getApplications: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getApplications: mocks.getApplications,
  getPreferenceValues: vi.fn(() => ({})),
  open: mocks.open,
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({
  executeSQL: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mocks.execFile,
}));

import { newTaskDeepLink, openWorkspace, threadDeepLink, type NewTaskTarget } from "../src/lib/open-codex";

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
