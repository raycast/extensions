import { describe, expect, it, vi } from "vitest";
import { lookupHerdrClientTtys } from "../src/lib/process-lookup";

describe("lookupHerdrClientTtys", () => {
  it("returns an empty list only when pgrep confirms no process", async () => {
    const capture = vi.fn().mockRejectedValue({ code: 1 });

    await expect(lookupHerdrClientTtys("/opt/herdr", "default", 250, capture)).resolves.toEqual([]);
  });

  it("returns unavailable when pgrep times out", async () => {
    const capture = vi.fn().mockRejectedValue({ code: null, killed: true, signal: "SIGTERM" });

    await expect(lookupHerdrClientTtys("/opt/herdr", "default", 250, capture)).resolves.toBeUndefined();
  });

  it("returns unavailable when ps times out", async () => {
    const capture = vi
      .fn()
      .mockResolvedValueOnce("101")
      .mockRejectedValueOnce({ code: null, killed: true, signal: "SIGTERM" });

    await expect(lookupHerdrClientTtys("/opt/herdr", "default", 250, capture)).resolves.toBeUndefined();
  });

  it("returns TTYs for clients in the selected session", async () => {
    const capture = vi
      .fn()
      .mockResolvedValueOnce("101\n102")
      .mockResolvedValueOnce("ttys001 herdr herdr\nttys002 herdr herdr --session work");

    await expect(lookupHerdrClientTtys("/opt/herdr", "work", 250, capture)).resolves.toEqual(["/dev/ttys002"]);
  });
});
