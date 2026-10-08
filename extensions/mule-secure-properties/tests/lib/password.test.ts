import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: "/tmp/mule-secure-properties",
  },
  showHUD: vi.fn(),
  openExtensionPreferences: vi.fn(),
}));

import { openExtensionPreferences, showHUD } from "@raycast/api";
import { ERROR_MESSAGES } from "../../src/constants";
import { resolvePassword } from "../../src/utils";

describe("resolvePassword", () => {
  beforeEach(() => {
    vi.mocked(showHUD).mockReset();
    vi.mocked(openExtensionPreferences).mockReset();
  });

  it("prefers the form password when provided", async () => {
    await expect(resolvePassword(" form-key ", "default-key")).resolves.toBe("form-key");
    expect(showHUD).not.toHaveBeenCalled();
  });

  it("falls back to the default preference password", async () => {
    await expect(resolvePassword("   ", " default-key ")).resolves.toBe("default-key");
  });

  it("opens preferences when no password is available", async () => {
    await expect(resolvePassword(undefined, undefined)).resolves.toBeUndefined();
    expect(showHUD).toHaveBeenCalledWith(ERROR_MESSAGES.PASSWORD_NOT_SET);
    expect(openExtensionPreferences).toHaveBeenCalledOnce();
  });
});
