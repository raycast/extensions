import { Toast, open, popToRoot, showToast } from "@raycast/api";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@type/octarine";
import { HookRuntime } from "../../../helpers/hooks";

let activeRuntime = new HookRuntime();

vi.mock("react", () => ({
  useCallback: (callback: unknown, deps?: readonly unknown[]) => activeRuntime.useCallback(callback, deps),
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => activeRuntime.useEffect(effect, deps),
  useRef: <T>(initialValue: T) => activeRuntime.useRef(initialValue),
}));

type UseOpenDailyNote =
  (typeof import("@commands/open-daily-desk-note/hooks/use-open-note"))["useOpenDailyNote"];

let useOpenDailyNote: UseOpenDailyNote;

beforeAll(async () => {
  ({ useOpenDailyNote } = await import("@commands/open-daily-desk-note/hooks/use-open-note"));
});

beforeEach(() => {
  activeRuntime = new HookRuntime();
});

const workspaces: Workspace[] = [
  { name: "Alpha", path: "/tmp/alpha" },
  { name: "Beta", path: "/tmp/beta" },
];

async function renderHook(options: Parameters<UseOpenDailyNote>[0]): Promise<ReturnType<UseOpenDailyNote>> {
  activeRuntime.beginRender();
  const result = useOpenDailyNote(options);
  activeRuntime.flushEffects();
  await new Promise((resolve) => setTimeout(resolve, 0));
  return result;
}

describe("useOpenDailyNote", () => {
  it("does not auto-open an invalid date when the hook is disabled", async () => {
    await renderHook({
      date: "not a date",
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
      enabled: false,
    });

    expect(open).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("returns an opener for manual date actions", async () => {
    const rememberWorkspace = vi.fn(async () => undefined);
    const openDailyNote = await renderHook({
      date: "",
      requestedWorkspace: "",
      workspaces,
      status: { isLoading: false, failed: false },
      onWorkspaceOpened: rememberWorkspace,
    });

    await openDailyNote("2026-03-26", "Alpha");

    expect(open).toHaveBeenCalledWith("octarine://daily?date=2026-03-26&workspace=Alpha");
    expect(rememberWorkspace).toHaveBeenCalledWith("Alpha");
  });

  it("remembers the workspace before cleaning up Raycast", async () => {
    const rememberWorkspace = vi.fn(async () => undefined);
    vi.mocked(popToRoot).mockImplementationOnce(async () => {
      expect(rememberWorkspace).toHaveBeenCalledWith("Alpha");
    });

    const openDailyNote = await renderHook({
      date: "",
      requestedWorkspace: "",
      workspaces,
      status: { isLoading: false, failed: false },
      onWorkspaceOpened: rememberWorkspace,
    });

    await openDailyNote("2026-03-26", "Alpha");
  });

  it("does not open anything when there is no date", async () => {
    await renderHook({
      date: "",
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
    });
    await renderHook({
      date: "",
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: false, failed: false },
    });

    expect(open).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("opens the daily note for the requested date and remembers the workspace", async () => {
    const rememberWorkspace = vi.fn(async () => undefined);
    await renderHook({
      date: "2026-03-26",
      requestedWorkspace: "alpha",
      workspaces,
      status: { isLoading: false, failed: false },
      onWorkspaceOpened: rememberWorkspace,
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("octarine://daily?date=2026-03-26&workspace=Alpha");
    expect(rememberWorkspace).toHaveBeenCalledWith("Alpha");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("does not remember the workspace when no callback is provided", async () => {
    await renderHook({
      date: "2026-03-26",
      requestedWorkspace: "Alpha",
      workspaces,
      status: { isLoading: false, failed: false },
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("reports opening failures without remembering the workspace", async () => {
    const rememberWorkspace = vi.fn(async () => undefined);
    vi.mocked(open).mockRejectedValueOnce(new Error("Open failed"));
    const openDailyNote = await renderHook({
      date: "",
      requestedWorkspace: "",
      workspaces,
      status: { isLoading: false, failed: false },
      onWorkspaceOpened: rememberWorkspace,
    });

    await openDailyNote("2026-03-26", "Alpha");
    expect(rememberWorkspace).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to Open Daily Desk Note",
      message: "Open failed",
    });
  });

  it("shows the workspace-not-found toast once for a missing workspace", async () => {
    await renderHook({
      date: "2026-03-26",
      requestedWorkspace: "Missing",
      workspaces,
      status: { isLoading: false, failed: false },
    });

    expect(open).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Workspace “Missing” not found",
    });
  });
});
