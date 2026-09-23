export const KEYCHAIN_SERVICE = "ssh-image-drop";

/** security -i 대화 모드의 인자 escaping — backslash·double quote. 개행은 명령 종결자라 거부(주입 차단). */
export function securityEscape(s: string): string {
  if (/[\r\n]/.test(s))
    throw new Error("newline is not allowed in keychain values");
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Keychain 저장 커맨드 (security -i의 stdin으로 공급 — PW argv 미노출).
 * -U: 기존 항목 갱신 허용, -T: security CLI의 무프롬프트 조회 허용
 */
export function buildAddCommand(alias: string, password: string): string {
  return `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a ${securityEscape(alias)} -w ${securityEscape(password)} -T /usr/bin/security\n`;
}

export function buildDeleteArgs(alias: string): string[] {
  return ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", alias];
}
