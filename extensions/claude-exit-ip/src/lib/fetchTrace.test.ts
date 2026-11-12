import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrace } from "./fetchTrace";
import { parseTrace } from "./trace";

vi.mock("./trace", () => ({ parseTrace: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(parseTrace).mockReset();
});

describe("fetchTrace", () => {
  it("reports a network failure as unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(fetchTrace(new AbortController().signal)).resolves.toEqual({ kind: "unreachable" });
  });

  it("lets a parse error through instead of reporting unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("h=claude.ai\nip=1.1.1.1\n")));
    vi.mocked(parseTrace).mockImplementation(() => {
      throw new Error("parse bug");
    });
    await expect(fetchTrace(new AbortController().signal)).rejects.toThrow("parse bug");
  });
});
