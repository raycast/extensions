import { describe, expect, it, vi } from "vitest";
import { openProject } from "./open-project";

describe("openProject", () => {
  it("opens the project before closing Raycast", async () => {
    const calls: string[] = [];
    const open = vi.fn(async () => {
      calls.push("open");
    });
    const close = vi.fn(async () => {
      calls.push("close");
    });

    await openProject(open, close);

    expect(calls).toEqual(["open", "close"]);
  });

  it("succeeds when closing Raycast fails after opening the project", async () => {
    const open = vi.fn(async () => undefined);
    const close = vi.fn(async () => {
      throw new Error("could not close Raycast");
    });

    await expect(openProject(open, close)).resolves.toBeUndefined();
    expect(open).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
