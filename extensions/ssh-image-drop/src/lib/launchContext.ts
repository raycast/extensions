import { isValidHost, validateRemotePath } from "./validate";

export type SelectorPayload = "finder" | "clipboard" | "pull" | "none";

export interface SelectorContext {
  payload: SelectorPayload;
  remotePath?: string;
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
