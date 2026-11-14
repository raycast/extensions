import { shQuote } from "./validate";

/**
 * ssh-copy-id의 이식 대체 — 원격 POSIX sh에서 authorized_keys에 공개키 1줄을 멱등 추가.
 * 공개키는 비밀이 아니므로 원격 명령 문자열에 shQuote로 내장한다 — stdin은 비워 askpass
 * 흐름(비밀번호 프롬프트)과의 간섭을 피한다. Windows에는 ssh-copy-id가 없어 필수.
 */
export function buildInstallKeyCommand(pubKeyLine: string): string {
  const key = pubKeyLine.trim();
  // 개행 포함 키는 명령 구조를 바꿀 수 있어 거부 — ssh-keygen 산출물은 항상 1줄
  if (!key || /[\r\n]/.test(key))
    throw new Error("public key must be a single non-empty line");
  const q = shQuote(key);
  return (
    "mkdir -p ~/.ssh && chmod 700 ~/.ssh && " +
    "touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && " +
    // grep -qxF: 정확히 같은 줄이 이미 있으면 추가 생략(재등록 멱등). 그룹핑으로 || 우선순위 고정.
    `{ grep -qxF ${q} ~/.ssh/authorized_keys || printf '%s\\n' ${q} >> ~/.ssh/authorized_keys; }`
  );
}

/**
 * 키 설치용 ssh argv (원격 명령 제외 공통부). Mac ssh-copy-id 호출과 동일한 옵션 조합 —
 * 1회용 PW는 재프롬프트 불가하므로 NumberOfPasswordPrompts=1 필수 (재프롬프트 시 영구 hang).
 */
export function buildInstallKeyArgs(
  user: string,
  hostName: string,
  port: string,
  remoteCmd: string,
): string[] {
  return [
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=5",
    "-o",
    "NumberOfPasswordPrompts=1",
    "-o",
    "KbdInteractiveAuthentication=no",
    "-o",
    "PreferredAuthentications=password",
    "-p",
    port,
    `${user}@${hostName}`,
    remoteCmd,
  ];
}
