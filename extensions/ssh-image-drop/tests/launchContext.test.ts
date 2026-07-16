import { describe, it, expect } from "vitest";
import { parseSelectorContext } from "../src/lib/launchContext";

describe("parseSelectorContext", () => {
  it("clipboard payload를 그대로 통과", () => {
    expect(parseSelectorContext({ payload: "clipboard" })).toEqual({
      payload: "clipboard",
    });
  });
  it("context 유입 finder는 none으로 접는다 (finder는 런타임 결정만)", () => {
    expect(parseSelectorContext({ payload: "finder" })).toEqual({
      payload: "none",
    });
  });
  it("유효한 pull은 remotePath 동반", () => {
    expect(
      parseSelectorContext({ payload: "pull", remotePath: "/tmp/a.png" }),
    ).toEqual({
      payload: "pull",
      remotePath: "/tmp/a.png",
    });
  });
  it("remotePath 없는 pull은 none으로 폴백", () => {
    expect(parseSelectorContext({ payload: "pull" })).toEqual({
      payload: "none",
    });
  });
  it("무효 remotePath(상대경로) pull은 none으로 폴백", () => {
    expect(
      parseSelectorContext({ payload: "pull", remotePath: "relative/x" }),
    ).toEqual({ payload: "none" });
  });
  it("알 수 없는/누락/비객체 payload는 none", () => {
    expect(parseSelectorContext({ payload: "bogus" })).toEqual({
      payload: "none",
    });
    expect(parseSelectorContext({})).toEqual({ payload: "none" });
    expect(parseSelectorContext(undefined)).toEqual({ payload: "none" });
    expect(parseSelectorContext(null)).toEqual({ payload: "none" });
    expect(parseSelectorContext("finder")).toEqual({ payload: "none" });
  });
});
