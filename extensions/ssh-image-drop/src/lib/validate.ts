import { homedir } from "os";
import { join } from "path";

/** 전송 대상 host — ssh alias, user@host, IPv4. 선행 -/./@ 차단(옵션 주입 방지). IPv6 미지원(README 고지). */
const HOST_RE = /^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/;
/** 등록용 alias·User — ssh Host 매칭 이름/계정명이므로 @ 불허. config 문법 오염 방지. */
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
/**
 * 제어문자 + 레거시 scp/원격 shell 주입 유발 metachar. macOS 13+ scp는 SFTP라 경로가 리터럴이지만,
 * 구형 macOS의 legacy scp는 원격 경로를 shell로 평가하므로 방어 심층으로 이들 문자를 원천 거부한다.
 * 유니코드 파일명·공백은 허용(SFTP 리터럴 operand로 안전).
 */
// eslint-disable-next-line no-control-regex -- 제어문자 거부는 의도된 보안 검증
const UNSAFE_PATH_RE = /[\x00-\x1f\x7f;&|`$()<>\\"'{}[\]!*?]/;

export function isValidHost(v: string): boolean {
  return HOST_RE.test(v);
}

export function isValidName(v: string): boolean {
  return NAME_RE.test(v);
}

export function isValidPort(v: string): boolean {
  if (!/^\d+$/.test(v)) return false;
  const n = Number(v);
  return n >= 1 && n <= 65535;
}

/** 원격 shell용 single-quote escaping — Send 원격 명령 전용 (Pull은 원격 shell 미경유라 불필요) */
export function shQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export function remoteBasename(p: string): string {
  return p.replace(/\/+$/, "").split("/").pop() ?? "";
}

/** Pull 원격 경로 검증 — 통과 시 null, 실패 시 에러 메시지. 비신뢰 입력(클립보드·딥링크) 방어 */
export function validateRemotePath(p: string): string | null {
  if (!p.startsWith("/")) return "Remote path must be absolute (start with /).";
  if (p.endsWith("/")) return "Remote path must point to a file."; // 후행 슬래시 = 디렉토리 지정
  if (UNSAFE_PATH_RE.test(p)) return "Remote path contains unsafe characters.";
  if (p.split("/").some((s) => s === "." || s === ".."))
    return "Remote path must not contain . or .. segments.";
  if (remoteBasename(p) === "") return "Remote path must point to a file.";
  return null;
}

/** remoteDir 안전성 — 절대경로 또는 서버 home(`~/`) + metachar/`..` 없음. `~foo`·상대경로는 거부. */
export function isSafeRemoteDir(dir: string): boolean {
  if (!/^(\/|~\/)/.test(dir)) return false;
  if (UNSAFE_PATH_RE.test(dir)) return false;
  return !dir.split("/").some((s) => s === "." || s === "..");
}

/** Finder 파일 basename 안전성 — 원격 경로 <dir>/<basename> 주입 방지. 선행 `-`·`.`/`..`도 거부. */
export function isSafeBasename(name: string): boolean {
  return (
    name !== "" &&
    name !== "." &&
    name !== ".." &&
    !name.startsWith("-") &&
    !UNSAFE_PATH_RE.test(name)
  );
}

export function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}
