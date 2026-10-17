import { beforeEach, describe, expect, it, vi } from "vitest";
import { getThawAction, type ThawActionId } from "../data";
import { openThawUrl } from "./openUrl";
import { runThawAction } from "./runAction";

vi.mock("./openUrl", () => ({
  openThawUrl: vi.fn(),
}));

describe("runThawAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches the shared action definition", async () => {
    vi.mocked(openThawUrl).mockResolvedValue(true);
    const action = getThawAction("toggle-auto-rehide");

    await expect(runThawAction("toggle-auto-rehide")).resolves.toBe(true);

    expect(openThawUrl).toHaveBeenCalledWith(action.action, action.successMessage, action.query);
  });

  it("throws for unknown action ids", async () => {
    await expect(runThawAction("not-a-real-action" as ThawActionId)).rejects.toThrow("Unknown Thaw action");
    expect(openThawUrl).not.toHaveBeenCalled();
  });
});
