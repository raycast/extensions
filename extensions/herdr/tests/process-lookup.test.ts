import { describe, expect, it, vi } from "vitest";
import { lookupHerdrClientTtys, lookupHerdrClients } from "../src/lib/process-lookup";

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

describe("lookupHerdrClients", () => {
  it("returns pid and tty pairs for clients that name the session", async () => {
    const capture = vi
      .fn()
      .mockResolvedValueOnce("101\n102")
      .mockResolvedValueOnce("101 ttys001 herdr herdr\n102 ttys002 herdr herdr --session work");

    await expect(lookupHerdrClients("/opt/herdr", "work", 250, capture)).resolves.toEqual([
      { pid: "102", tty: "/dev/ttys002" },
    ]);
    expect(capture).toHaveBeenLastCalledWith("/bin/ps", ["-p", "101,102", "-o", "pid=,tty=,comm=,args="], 250);
  });

  it("returns an empty list when pgrep confirms no process and unavailable when ps fails", async () => {
    await expect(
      lookupHerdrClients("/opt/herdr", "work", 250, vi.fn().mockRejectedValue({ code: 1 })),
    ).resolves.toEqual([]);
    const capture = vi.fn().mockResolvedValueOnce("101").mockRejectedValueOnce({ code: null, killed: true });
    await expect(lookupHerdrClients("/opt/herdr", "work", 250, capture)).resolves.toBeUndefined();
  });
});
