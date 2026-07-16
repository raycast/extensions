import { shQuote, remoteBasename } from "./validate";

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

export function buildSendArgs(
  host: string,
  remoteDir: string,
  fileName: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  const remoteCmd = `mkdir -p ${shQuote(dir)} && cat > ${shQuote(`${dir}/${fileName}`)}`;
  return [...authOpts(mode), host, remoteCmd];
}

/** scp(sftp 프로토콜) — 원격 shell 미경유이므로 경로는 argv operand로 그대로 전달 */
export function buildPullArgs(
  host: string,
  remotePath: string,
  localPath: string,
  mode: AuthMode,
): string[] {
  return [...authOpts(mode), `${host}:${remotePath}`, localPath];
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

/** Finder 로컬 파일 → 원격. scp(sftp) operand — 원격 경로 = <dir>/<원본 basename>, 동명 덮어쓰기 */
export function buildSendFileArgs(
  host: string,
  remoteDir: string,
  localPath: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  const remote = `${host}:${dir}/${remoteBasename(localPath)}`;
  return [...authOpts(mode), localPath, remote];
}

/** Finder 전송 전 원격 디렉토리 준비 (scp 대상 부재 시 실패 방지). ssh 원격 shell 경유 → shQuote */
export function buildMkdirArgs(
  host: string,
  remoteDir: string,
  mode: AuthMode,
): string[] {
  const dir = remoteDir.replace(/\/+$/, "");
  return [...authOpts(mode), host, `mkdir -p ${shQuote(dir)}`];
}
