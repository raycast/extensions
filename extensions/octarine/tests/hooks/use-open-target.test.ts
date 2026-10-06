import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HookRuntime } from "../helpers/hooks";
import type { Workspace } from "@type/octarine";

let activeRuntime = new HookRuntime();

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => activeRuntime.useEffect(effect, deps),
  useRef: <T>(initialValue: T) => activeRuntime.useRef(initialValue),
}));

type UseOpenTarget = (typeof import("@hooks/use-open-target"))["useOpenTarget"];

let useOpenTarget: UseOpenTarget;

beforeAll(async () => {
  ({ useOpenTarget } = await import("@hooks/use-open-target"));
});

beforeEach(() => {
  vi.clearAllMocks();
  activeRuntime = new HookRuntime();
});

const workspaces: Workspace[] = [
  { name: "Alpha", path: "/tmp/alpha" },
  { name: "Beta", path: "/tmp/beta" },
];

async function renderHook(options: Parameters<UseOpenTarget>[0]): Promise<void> {
  activeRuntime.beginRender();
  useOpenTarget(options);
  activeRuntime.flushEffects();
  await Promise.resolve();
}

describe("useOpenTarget", () => {
  it("does nothing when no workspace was requested", async () => {
    const open = vi.fn(async () => undefined);

    await renderHook({
      requestedWorkspace: "",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(open).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("opens the matched workspace", async () => {
    const open = vi.fn(async () => undefined);

    await renderHook({
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("Alpha");
    expect(showToast).not.toHaveBeenCalled();
    expect(showFailureToast).not.toHaveBeenCalled();
  });

  it.each([new Error("Open failed"), "Open failed"])("reports opening failures (%s)", async (error) => {
    const open = vi.fn(async () => {
      throw error;
    });

    await renderHook({
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(showFailureToast).toHaveBeenCalledTimes(1);
    expect(showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to Open Workspace" });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("does not reopen on a rerender when dependencies are unchanged", async () => {
    const open = vi.fn(async () => undefined);
    const options = {
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    };

    await renderHook(options);
    await renderHook(options);

    expect(open).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows the workspace-not-found toast once per missing workspace", async () => {
    const open = vi.fn(async () => undefined);

    await renderHook({
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(open).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Workspace “Missing” not found",
    });

    await renderHook({
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(showToast).toHaveBeenCalledTimes(1);

    await renderHook({
      requestedWorkspace: "Still Missing",
      workspaces,
      status: { isLoading: false, failed: false },
      open,
    });

    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it("suppresses not-found toasts while loading or after load failure", async () => {
    const open = vi.fn(async () => undefined);

    await renderHook({
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: true, failed: false },
      open,
    });
    await renderHook({
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: false, failed: true },
      open,
    });

    expect(showToast).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
