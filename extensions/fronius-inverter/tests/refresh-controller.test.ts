import { describe, expect, it, vi } from "vitest";
import { createRefreshController } from "../src/refresh-controller";

describe("createRefreshController", () => {
  it("keeps manual feedback when it joins an automatic refresh", async () => {
    let finish: ((result: { errorMessage?: string }) => void) | undefined;
    const operation = vi.fn(
      () =>
        new Promise<{ errorMessage?: string }>((resolve) => {
          finish = resolve;
        }),
    );
    const showResult = vi.fn(async () => undefined);
    const refresh = createRefreshController(operation, showResult);

    const automatic = refresh(false);
    const manual = refresh(true);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(showResult).not.toHaveBeenCalled();

    finish?.({});
    await Promise.all([automatic, manual]);

    expect(showResult).toHaveBeenCalledOnce();
    expect(showResult).toHaveBeenCalledWith({});
  });

  it("passes a shared failure result to the manual feedback handler", async () => {
    const result = { errorMessage: "offline" };
    const operation = vi.fn(async () => result);
    const showResult = vi.fn(async () => undefined);
    const refresh = createRefreshController(operation, showResult);

    await refresh(true);

    expect(showResult).toHaveBeenCalledWith(result);
  });
});
