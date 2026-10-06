import { Toast, showToast } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaces, showFailureToast, usePromise } = vi.hoisted(() => ({
  getWorkspaces: vi.fn(),
  showFailureToast: vi.fn(),
  usePromise: vi.fn(),
}));

vi.mock("@lib/workspaces", () => ({ getWorkspaces }));
vi.mock("@raycast/utils", () => ({ showFailureToast, usePromise }));

import { useWorkspaces } from "@hooks/use-workspaces";

beforeEach(() => {
  vi.clearAllMocks();
  usePromise.mockReturnValue({ data: undefined, error: undefined, isLoading: false, revalidate: vi.fn() });
});

describe("useWorkspaces", () => {
  it("keeps valid workspaces and reports invalid roots", async () => {
    getWorkspaces.mockResolvedValue([
      { name: "Alpha", path: "/tmp/alpha" },
      { name: "Ignored", path: "/tmp/ignored", ignored: true },
      { name: "Missing", path: "/tmp/missing", invalid: true },
    ]);

    useWorkspaces();
    const load = usePromise.mock.calls[0][0] as (refresh: boolean) => Promise<unknown>;

    await expect(load(false)).resolves.toEqual([{ name: "Alpha", path: "/tmp/alpha" }]);
    expect(getWorkspaces).toHaveBeenCalledWith({ refresh: false });
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Invalid workspace root paths",
      message: "1 paths could not be found",
    });
  });

  it("reports an empty visible workspace list", async () => {
    getWorkspaces.mockResolvedValue([{ name: "Ignored", path: "/tmp/ignored", ignored: true }]);

    useWorkspaces();
    const load = usePromise.mock.calls[0][0] as (refresh: boolean) => Promise<unknown>;

    await expect(load(false)).resolves.toEqual([]);
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "No workspaces found",
      message: "Check root paths in preferences",
    });
  });

  it("reports loading failures without treating them as missing workspaces", async () => {
    const error = new Error("Scan failed");
    const revalidate = vi.fn();
    usePromise.mockReturnValue({ data: undefined, error, isLoading: false, revalidate });

    const result = useWorkspaces();
    const options = usePromise.mock.calls[0][2] as { onError: (error: Error) => Promise<void> };
    await options.onError(error);

    expect(result).toEqual({ workspaces: [], status: { isLoading: false, failed: true }, revalidate });
    expect(showFailureToast).toHaveBeenCalledWith(error, {
      title: "Failed to load workspaces",
      message: "Try again. If it keeps failing, report the error.",
    });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("refreshes the scan and reports success after data arrives", async () => {
    getWorkspaces.mockResolvedValue([{ name: "Alpha", path: "/tmp/alpha" }]);

    useWorkspaces({ refresh: true });
    const [load, args, options] = usePromise.mock.calls[0] as [
      (refresh: boolean) => Promise<unknown>,
      boolean[],
      { onData: () => void },
    ];
    await load(args[0]);
    options.onData();

    expect(getWorkspaces).toHaveBeenCalledWith({ refresh: true });
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Workspaces refreshed" });
  });
});
