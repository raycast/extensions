import { globEscape, shQuote, localBasename } from "./validate";

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
