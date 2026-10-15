import { describe, expect, it } from "vitest";
import { LEGACY_STORAGE_WORKSPACE_SLUG_KEY, STORAGE_WORKSPACE_SLUG_KEY } from "../src/helpers/keys";

describe("workspace slug storage keys", () => {
  it("never contains the raw token", () => {
    const token = "plane_api_secret123";
    const key = STORAGE_WORKSPACE_SLUG_KEY(token);
    expect(key).not.toContain(token);
    expect(key).toMatch(/^workspace-slug:sha256:[0-9a-f]{64}$/);
    expect(LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token)).toBe(`workspace-slug:${token}`);
  });
});
