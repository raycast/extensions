import { describe, expect, it } from "vitest";
import { parseSession, parseSessions } from "./parsers";

describe("parseSessions", () => {
  it("reads sessions", () => {
    expect(parseSessions('{"sessions":[{"session_id":"s1","label":"a"}]}')).toEqual([{ session_id: "s1", label: "a" }]);
  });
  it("returns [] when there are none", () => {
    expect(parseSessions("{}")).toEqual([]);
  });
});

describe("parseSession", () => {
  it("flattens blocks across layers", () => {
    const json = JSON.stringify({
      active_window_id: "w1",
      windows: [
        { window_id: "w1", label: "one", layers: [{ blocks: [{ block_id: "b1" }] }, { blocks: [{ block_id: "b2" }] }] },
      ],
    });
    expect(parseSession(json)).toEqual({
      active: "w1",
      windows: [{ window_id: "w1", label: "one", blocks: [{ block_id: "b1" }, { block_id: "b2" }] }],
    });
  });
  it("tolerates windows without layers or blocks, and sessions without windows", () => {
    const json = JSON.stringify({
      windows: [
        { window_id: "w", label: "x" },
        { window_id: "v", label: "y", layers: [{}] },
      ],
    });
    expect(parseSession(json).windows.map((w) => w.blocks)).toEqual([[], []]);
    expect(parseSession("{}").windows).toEqual([]);
  });
});
