import { showHUD } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showError } from "./error";

describe("showError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Error messages in the HUD", async () => {
    await showError(new Error("failed"));
    expect(showHUD).toHaveBeenCalledWith("Error: failed");
  });

  it("stringifies unknown errors", async () => {
    await showError("nope");
    expect(showHUD).toHaveBeenCalledWith("Error: nope");
  });
});
