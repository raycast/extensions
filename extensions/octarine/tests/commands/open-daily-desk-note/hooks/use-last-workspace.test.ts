import { Toast, showToast } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@type/octarine";

const { usePromise } = vi.hoisted(() => ({
  usePromise: vi.fn(),
}));

vi.mock("@raycast/utils", () => ({ usePromise }));
vi.mock("react", () => ({ useCallback: (callback: unknown) => callback }));

import { useLastWorkspace } from "@commands/open-daily-desk-note/hooks/use-last-workspace";

const workspaces: Workspace[] = [
  { name: "Work", path: "/tmp/work" },
  { name: "Personal", path: "/tmp/personal" },
];

beforeEach(() => {
  vi.clearAllMocks();
  usePromise.mockReturnValue({
    data: "work",
    isLoading: false,
    mutate: vi.fn(async () => undefined),
  });
});

describe("useLastWorkspace", () => {
  it("resolves the stored workspace against the indexed workspaces", () => {
    const result = useLastWorkspace({ workspaces });

    expect(result.workspace).toEqual(workspaces[0]);
    expect(result.isLoading).toBe(false);
  });

  it("remembers a workspace with an optimistic update", async () => {
    const result = useLastWorkspace({ workspaces });
    const { mutate } = usePromise.mock.results[0].value;

    await result.remember("Personal");

    expect(mutate).toHaveBeenCalledWith(expect.any(Promise), { optimisticUpdate: expect.any(Function) });
  });

  it("clears the stored workspace and updates the optimistic value", async () => {
    const result = useLastWorkspace({ workspaces });
    const { mutate } = usePromise.mock.results[0].value;

    await result.clear();

    expect(mutate).toHaveBeenCalledWith(expect.any(Promise), { optimisticUpdate: expect.any(Function) });
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Last workspace cleared",
    });
  });

  it("reports failures when clearing the last workspace", async () => {
    const mutate = vi.fn(async () => {
      throw new Error("Clear failed");
    });
    usePromise.mockReturnValue({ data: "work", isLoading: false, mutate });

    const result = useLastWorkspace({ workspaces });
    await result.clear();

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to Clear Last Workspace",
      message: "Clear failed",
    });
  });
});
