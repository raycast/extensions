import { darwinAdapter } from "./darwin";
import { win32Adapter } from "./win32";
import { PlatformAdapter } from "./types";

/**
 * 플랫폼 어댑터 단일 진입점. manifest `platforms`가 macOS·Windows만 선언하므로 그 외는 도달 불가 —
 * 방어적으로 darwin을 기본값으로 둔다(기존 동작 보존).
 */
export const platform: PlatformAdapter =
  process.platform === "win32" ? win32Adapter : darwinAdapter;

export { lastLine } from "./types";
export type { PlatformAdapter } from "./types";
