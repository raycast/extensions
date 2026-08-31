import { isValidHost, validateRemotePath } from "./validate";

export type SelectorPayload =
  "finder" | "clipboard" | "remote-clipboard" | "pull" | "none";

export interface SelectorContext {
  payload: SelectorPayload;
  remotePath?: string;
  /**
   * remote-clipboard 전용 — 위임 시점에 캡처한 선택 텍스트. Raycast 창이 열리면 원래 앱의
   * 선택이 풀려 셀렉터에서는 다시 읽을 수 없으므로, 호출 커맨드가 캡처해 넘긴다.
   */
  selectedText?: string;
  /** finder 딥링크(Quicklink) 전용 — 고정 대상 서버. 파일은 실행 시점 Finder 선택으로 읽는다. */
  host?: string;
}

export interface NoViewContext {
  host?: string;
}

/**
 * launchContext(비신뢰 — 수동·오염 딥링크 가능)를 SelectorContext로 정규화한다.
 * 알 수 없는/누락 payload, 또는 remotePath가 없거나 무효한 pull은 none(전송 대상 없음 → 경고 후 종료)으로 폴백한다.
 */
export function parseSelectorContext(raw: unknown): SelectorContext {
  if (!raw || typeof raw !== "object") return { payload: "none" };
  const o = raw as Record<string, unknown>;
  if (o.payload === "clipboard") return { payload: "clipboard" };
  // 원격 클립보드 주입. 선택 텍스트만 context로 받는다 — Raycast 창이 뜨면 원래 앱의 선택이
  // 풀려 셀렉터가 직접 읽을 수 없기 때문이다(클립보드는 셀렉터가 직접 읽으므로 싣지 않는다).
  // 비신뢰 입력이라 문자열이 아니면 버리고, 내용 자체는 원격 명령에 보간되지 않고 stdin으로만 흐른다.
  if (o.payload === "remote-clipboard") {
    const sel = typeof o.selectedText === "string" ? o.selectedText : "";
    return sel.trim() !== ""
      ? { payload: "remote-clipboard", selectedText: sel }
      : { payload: "remote-clipboard" };
  }
  if (o.payload === "pull") {
    const rp = typeof o.remotePath === "string" ? o.remotePath.trim() : "";
    if (rp && validateRemotePath(rp) === null)
      return { payload: "pull", remotePath: rp };
  }
  // finder는 host 고정 Quicklink 딥링크만 인정 — 파일 목록은 절대 context로 받지 않는다(런타임 Finder 선택 전용).
  // host는 구문 검증만 여기서 하고, known 서버 여부는 전송 직전 ensureKnownHost가 재검증한다.
  if (o.payload === "finder") {
    const host = typeof o.host === "string" ? o.host.trim() : "";
    if (host && isValidHost(host)) return { payload: "finder", host };
  }
  return { payload: "none" };
}
