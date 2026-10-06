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
  it.each([false, true])("keeps valid workspaces and reports invalid roots (refresh: %s)", async (refresh) => {
    getWorkspaces.mockResolvedValue([
      { name: "Alpha", path: "/tmp/alpha" },
      { name: "Ignored", path: "/tmp/ignored", ignored: true },
      { name: "Missing", path: "/tmp/missing", invalid: true },
    ]);

    useWorkspaces({ refresh });
    const load = usePromise.mock.calls[0][0] as (refresh: boolean) => Promise<unknown>;
    const options = usePromise.mock.calls[0][2] as { onData?: () => void };

    await expect(load(refresh)).resolves.toEqual([{ name: "Alpha", path: "/tmp/alpha" }]);
    options.onData?.();

    expect(getWorkspaces).toHaveBeenCalledWith({ refresh });
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Invalid workspace root paths",
      message: "1 paths could not be found",
    });
  });

  it.each([false, true])("reports an empty visible workspace list (refresh: %s)", async (refresh) => {
    getWorkspaces.mockResolvedValue([{ name: "Ignored", path: "/tmp/ignored", ignored: true }]);

    useWorkspaces({ refresh });
    const load = usePromise.mock.calls[0][0] as (refresh: boolean) => Promise<unknown>;
    const options = usePromise.mock.calls[0][2] as { onData?: () => void };

    await expect(load(refresh)).resolves.toEqual([]);
    options.onData?.();

    expect(showToast).toHaveBeenCalledTimes(1);
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
    const [load, args] = usePromise.mock.calls[0] as [(refresh: boolean) => Promise<unknown>, boolean[]];
    await load(args[0]);

    expect(getWorkspaces).toHaveBeenCalledWith({ refresh: true });
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Workspaces refreshed" });
  });
});
