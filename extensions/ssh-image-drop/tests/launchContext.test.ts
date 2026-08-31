import { describe, it, expect } from "vitest";
import { parseSelectorContext } from "../src/lib/launchContext";

describe("parseSelectorContext", () => {
  it("clipboard payload를 그대로 통과", () => {
    expect(parseSelectorContext({ payload: "clipboard" })).toEqual({
      payload: "clipboard",
    });
  });
  it("host 있는 finder는 Quicklink 딥링크로 인정 (서버만 고정, 파일은 런타임)", () => {
    expect(parseSelectorContext({ payload: "finder", host: "web-1" })).toEqual({
      payload: "finder",
      host: "web-1",
    });
  });
  it("host 없는/무효 host finder는 none으로 접는다", () => {
    expect(parseSelectorContext({ payload: "finder" })).toEqual({
      payload: "none",
    });
    expect(parseSelectorContext({ payload: "finder", host: "-bad" })).toEqual({
      payload: "none",
    });
    expect(parseSelectorContext({ payload: "finder", host: 42 })).toEqual({
      payload: "none",
    });
  });
  it("finder context의 파일 목록은 무시된다 (파일은 절대 context로 받지 않음)", () => {
    expect(
      parseSelectorContext({
        payload: "finder",
        host: "web-1",
        files: ["/etc/passwd"],
      }),
    ).toEqual({ payload: "finder", host: "web-1" });
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

describe("parseSelectorContext — remote-clipboard", () => {
  it("원격 클립보드 위임을 인식한다", () => {
    expect(parseSelectorContext({ payload: "remote-clipboard" })).toEqual({
      payload: "remote-clipboard",
    });
  });
  it("전송 데이터는 context로 받지 않는다 — 실행 시점 클립보드가 유일한 출처", () => {
    expect(
      parseSelectorContext({ payload: "remote-clipboard", text: "injected" }),
    ).toEqual({ payload: "remote-clipboard" });
  });
});

describe("parseSelectorContext — remote-clipboard는 전송 대상을 context로 받지 않는다", () => {
  it("selectedText가 실려 와도 무시한다 — 조작된 딥링크가 공격자 문자열을 '사용자가 지정한 텍스트'로 위장할 수 있다", () => {
    expect(
      parseSelectorContext({
        payload: "remote-clipboard",
        selectedText: "attacker-controlled",
      }),
    ).toEqual({ payload: "remote-clipboard" });
  });
  it("payload만 통과 — 실제 선택 텍스트는 LocalStorage 핸드오프로 넘어온다", () => {
    expect(parseSelectorContext({ payload: "remote-clipboard" })).toEqual({
      payload: "remote-clipboard",
    });
  });
});
