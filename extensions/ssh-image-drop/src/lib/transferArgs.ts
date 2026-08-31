import { REMOTE_SENTINEL_NO_GUI, REMOTE_SENTINEL_NO_MAC } from "./serverKind";
import { globEscape, localBasename, shQuote } from "./validate";

export type AuthMode = "key" | "keychain";

const BASE_OPTS = [
  "-o",
  "ConnectTimeout=5",
  "-o",
  "ServerAliveInterval=5",
  "-o",
  "ServerAliveCountMax=2",
];

function authOpts(mode: AuthMode): string[] {
  if (mode === "key") return [...BASE_OPTS, "-o", "BatchMode=yes"];
  // keychain host: publickey 시도를 끄고 password 우선 — askpass가 키 passphrase 프롬프트에 오용되는 것 방지.
  // known_hosts 미등록 대비 accept-new, 오답 PW 빠른 실패 위해 프롬프트 1회 제한
  return [
    ...BASE_OPTS,
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "PubkeyAuthentication=no",
    "-o",
    "PreferredAuthentications=password,keyboard-interactive",
    "-o",
    "NumberOfPasswordPrompts=1",
  ];
}

/**
 * 원격 shell 명령용 경로 quote. `~/` prefix는 quote 밖에 남겨 원격 홈으로 확장되게 한다 —
 * 작은따옴표 안에서는 tilde가 확장되지 않아 `mkdir -p '~/x'`가 리터럴 `~` 디렉토리를 만든다.
 */
function shQuotePath(p: string): string {
  // bare `~`(홈 자체) — trailing slash 제거로 `~/`가 `~`가 된 경우 포함. 가변부가 없어 unquote가 안전하며,
  // quote하면 `'~'`가 되어 홈이 아닌 리터럴 `~` 디렉토리를 만든다.
  if (p === "~") return "~";
  if (p.startsWith("~/")) return `~/${shQuote(p.slice(2))}`;
  return shQuote(p);
}

export function buildSendArgs(
  host: string,
  remoteDir: string,
  fileName: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  const remoteCmd = `mkdir -p ${shQuotePath(dir)} && cat > ${shQuotePath(`${dir}/${fileName}`)}`;
  return [...authOpts(mode), host, remoteCmd];
}

/**
 * scp(sftp 프로토콜) — 원격 shell 미경유이지만 **source** 원격 경로는 서버측 glob 매칭을
 * 거치므로 globEscape로 [ ] { }를 literal 고정한다 (매칭 실패 시 literal 폴백이 있으나,
 * 디렉토리에 클래스 매칭 파일이 있으면 엉뚱한 파일을 가져온다 — escape가 결정론적).
 * target(업로드 대상)은 glob이 돌지 않으므로 buildSendFileArgs에서는 escape하지 않는다.
 * -r로 파일·폴더 모두 지원.
 */
export function buildPullArgs(
  host: string,
  remotePath: string,
  localPath: string,
  mode: AuthMode,
): string[] {
  // -s: SFTP 프로토콜 강제 — 구형 OpenSSH(9.0 미만, 일부 Windows 10 inbox)의 legacy scp는
  // 원격 경로를 원격 shell로 평가해 "no remote shell" 보안 전제가 깨진다. -s 미지원(8.7 미만)
  // 바이너리는 unknown option으로 즉시 실패(fail-closed) — silent 다운그레이드보다 안전.
  return [
    ...authOpts(mode),
    "-s",
    "-r",
    `${host}:${globEscape(remotePath)}`,
    localPath,
  ];
}

export function remoteFileName(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `clip-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}-${p(now.getMilliseconds(), 3)}.png`
  );
}

export function pickAvailableName(
  base: string,
  exists: (name: string) => boolean,
): string {
  if (!exists(base)) return base;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  for (let i = 1; ; i++) {
    const cand = `${stem}-${i}${ext}`;
    if (!exists(cand)) return cand;
  }
}

/**
 * Finder 로컬 파일/폴더 → 원격. scp(sftp) operand — 원격 경로 = <dir>/<원본 basename>.
 * -r로 폴더 재귀 업로드 지원. 파일은 동명 덮어쓰기, 폴더는 원격 동명 폴더 존재 시
 * 그 안으로 복사되는 scp 표준 semantics를 따른다.
 */
export function buildSendFileArgs(
  host: string,
  remoteDir: string,
  localPath: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  // 로컬 경로 basename — Windows `\` 구분자도 처리 (remoteBasename은 `/` 전용).
  // 원격 target은 escape 금지 — scp는 source만 glob하고 target은 literal이라,
  // escape하면 백슬래시가 파일명에 남는다 (실서버 실측).
  // -s: SFTP 강제 (buildPullArgs 주석 참조 — legacy scp 다운그레이드 차단)
  const remote = `${host}:${dir}/${localBasename(localPath)}`;
  return [...authOpts(mode), "-s", "-r", localPath, remote];
}

/** Finder 전송 전 원격 디렉토리 준비 (scp 대상 부재 시 실패 방지). ssh 원격 shell 경유 → shQuotePath(`~/` 확장 보존) */
export function buildMkdirArgs(
  host: string,
  remoteDir: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  return [...authOpts(mode), host, `mkdir -p ${shQuotePath(dir)}`];
}

/** Pull 대상이 원격 디렉토리인지 판별 (exit 0 = 디렉토리). ssh 원격 shell 경유 → shQuotePath(`~/` 확장 보존) */
export function buildIsDirArgs(
  host: string,
  remotePath: string,
  mode: AuthMode,
): string[] {
  return [...authOpts(mode), host, `test -d ${shQuotePath(remotePath)}`];
}

export type ClipboardKind = "text" | "image";

/**
 * 원격 클립보드 주입 명령 — 상수 템플릿 2개. 사용자 입력은 보간되지 않고 데이터는 stdin으로만
 * 흐르므로 인젝션 표면이 없다. 실측 근거(설계 §2·§6):
 *
 * - `LC_ALL` (LANG 아님): 원격 rc가 LC_ALL=C를 export하면 LANG이 무시돼 한글이 빈 값이 된다.
 * - 절대경로 고정: 원격 PATH 차이·오염 제거. launchctl은 /bin/launchctl이다(/usr/bin 아님).
 * - `/bin/sh -c` + 개행 없는 한 줄: ssh 원격 명령은 사용자 로그인 셸이 파싱한다. sh -c는
 *   어느 셸에서도 단순 명령이고, tcsh는 작은따옴표가 raw newline을 넘지 못한다.
 * - 검사 순서 127 → 126 → 데이터 소비: 뒤집으면 Linux에서 launchctl 부재가 126을 먼저 내
 *   "GUI 세션 없음"으로 오진한다. 선행 체크가 없으면 이미지가 전량 업로드된 뒤에 실패한다.
 * - GUI 세션 판정에 /dev/console 소유자 비교를 쓰지 않는 이유: Fast User Switching·화면공유
 *   가상 디스플레이에서 정상 구성을 오차단하고, 헤드리스에서 콘솔 소유자와 SSH 사용자가
 *   둘 다 root면 통과해버린다.
 * - stderr sentinel: exit code만으로는 원인을 단정할 수 없다(sh·env도 126/127을 낸다).
 * - 임시파일: osascript의 read는 seek 가능한 파일을 요구하고 ssh stdin은 pipe라
 *   /dev/stdin 직접 read가 -1700으로 실패한다.
 */
const GUARD =
  `|| { echo ${REMOTE_SENTINEL_NO_MAC} >&2; exit 127; }; ` +
  `/bin/launchctl print gui/$(/usr/bin/id -u) >/dev/null 2>&1 ` +
  `|| { echo ${REMOTE_SENTINEL_NO_GUI} >&2; exit 126; }; `;

const REMOTE_CLIPBOARD_SCRIPT: Record<ClipboardKind, string> = {
  text:
    `[ -x /usr/bin/pbcopy ] ${GUARD}` +
    `exec /usr/bin/env LC_ALL=en_US.UTF-8 /usr/bin/pbcopy`,
  image:
    `[ -x /usr/bin/osascript ] ${GUARD}` +
    `D=$(/usr/bin/mktemp -d -t ssh-image-drop) || exit 1; ` +
    `trap "/bin/rm -rf $D" EXIT; ` +
    `/bin/cat > "$D/c.png" || exit 1; ` +
    `/usr/bin/env LC_ALL=en_US.UTF-8 /usr/bin/osascript ` +
    `-e "on run argv" ` +
    `-e "set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)" ` +
    `-e "end run" "$D/c.png"`,
};

/** 로컬 클립보드를 원격 GUI 세션 클립보드로 주입. 데이터는 호출부가 stdin으로 공급한다. */
export function buildRemoteClipboardArgs(
  host: string,
  kind: ClipboardKind,
  mode: AuthMode,
): string[] {
  return [
    ...authOpts(mode),
    host,
    `/bin/sh -c ${shQuote(REMOTE_CLIPBOARD_SCRIPT[kind])}`,
  ];
}
