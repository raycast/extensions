import { validateRemotePath } from "./validate";

export type SelectorPayload = "finder" | "clipboard" | "pull" | "none";

export interface SelectorContext {
  payload: SelectorPayload;
  remotePath?: string;
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
  // finder는 런타임(getSelectedFinderItems)로만 결정 — context 유입 finder는 인정하지 않는다
  if (o.payload === "clipboard") return { payload: "clipboard" };
  if (o.payload === "pull") {
    const rp = typeof o.remotePath === "string" ? o.remotePath.trim() : "";
    if (rp && validateRemotePath(rp) === null)
      return { payload: "pull", remotePath: rp };
  }
  return { payload: "none" };
}
