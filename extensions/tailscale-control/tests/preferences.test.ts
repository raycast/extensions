import { describe, expect, it } from "vitest";

import { discoverTailscalePath } from "../src/lib/tailscale-path";

describe("discoverTailscalePath", () => {
  it("finds the Homebrew path when available", () => {
    expect(discoverTailscalePath("/opt/homebrew/bin:/usr/bin", (path) => path === "/opt/homebrew/bin/tailscale")).toBe(
      "/opt/homebrew/bin/tailscale",
    );
  });

  it("falls back to the bare command when no candidate is executable", () => {
    expect(discoverTailscalePath("/definitely/missing/one:/definitely/missing/two", () => false)).toBe("tailscale");
  });
});
