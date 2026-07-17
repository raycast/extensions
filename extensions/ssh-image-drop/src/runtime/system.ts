import {
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile, spawn } from "child_process";
import {
  chmodSync,
  constants,
  copyFileSync,
  createReadStream,
  existsSync,
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  lstatSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir, tmpdir } from "os";
import { dirname, join } from "path";
import { promisify } from "util";
import { ASKPASS_SCRIPT } from "../lib/askpassScript";
import { buildAddCommand, buildDeleteArgs } from "../lib/keychainCmd";
import { ensureIncludeContent, parseHostAliases } from "../lib/sshConfigText";
import {
  AuthMode,
  buildIsDirArgs,
  buildMkdirArgs,
  buildPullArgs,
  buildSendArgs,
  buildSendFileArgs,
  pickAvailableName,
  remoteFileName,
} from "../lib/transferArgs";
import { dedupeByBasename, isTransferable } from "../lib/finderFiles";
import { mergeHosts, parseAdditionalHosts } from "../lib/mergeHosts";
import {
  expandTilde,
  isSafeBasename,
  isSafeRemoteDir,
  isValidHost,
  isValidName,
  isValidPort,
  remoteBasename,
  validateRemotePath,
} from "../lib/validate";
import { getRecents } from "./store";

const execFileP = promisify(execFile);

const SSH = "/usr/bin/ssh";
const SCP = "/usr/bin/scp";
const OSASCRIPT = "/usr/bin/osascript";
const OPEN = "/usr/bin/open";
const SECURITY = "/usr/bin/security";
const SSH_COPY_ID = "/usr/bin/ssh-copy-id";
const SSH_KEYGEN = "/usr/bin/ssh-keygen";
const MKFIFO = "/usr/bin/mkfifo";

const SSH_DIR = join(homedir(), ".ssh");
export const MAIN_CONFIG_PATH = join(SSH_DIR, "config");
const MANAGED_CONFIG_PATH = join(SSH_DIR, "ssh_image_drop_config");
export const MANAGED_KEY_PATH = join(SSH_DIR, "ssh_image_drop_ed25519");

export function prefs(): Preferences {
  // 자동 생성 타입(raycast-env.d.ts) 사용 — manifest 변경 시 수동 interface가 어긋나는 드리프트 방지
  const p = getPreferenceValues<Preferences>();
  const rawDownloadDir = p.downloadDir?.trim() || "";
  return {
    // 미설정 시에만 기본값. 설정된 값은 그대로 전달하고 전송 진입점(runSend/runSendFiles)에서
    // isSafeRemoteDir로 검증·거부한다 — 불안전값을 공유 /tmp로 무고지 폴백(fail-open)하지 않기 위함
    remoteDir:
      p.remoteDir?.trim().replace(/\/+$/, "") || "/tmp/clipboard-images",
    additionalHosts: p.additionalHosts ?? "",
    // `/`·`~/`·bare `~`만 허용 — `~foo`·상대경로가 Raycast cwd에 리터럴 디렉토리를 만드는 것 방지
    downloadDir: /^(\/|~\/|~$)/.test(rawDownloadDir)
      ? rawDownloadDir
      : "~/Downloads",
    hideConfigHosts: p.hideConfigHosts ?? true,
  };
}

// ---------- ssh config ----------

export function readManagedConfig(): string {
  return existsSync(MANAGED_CONFIG_PATH)
    ? readFileSync(MANAGED_CONFIG_PATH, "utf8")
    : "";
}

/**
 * symlink 거부 + temp 후 atomic rename. 심링크를 통한 임의 파일 덮어쓰기와,
 * 비원자적 truncate 중 크래시로 인한 config 손상을 방지한다.
 */
function writeFileAtomicNoSymlink(
  path: string,
  content: string,
  mode: number,
): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink())
    throw new Error(`Refusing to write through a symlink: ${path}`);
  const tmp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, content, { mode, flag: "wx" }); // O_EXCL: 선점 symlink/파일 위 쓰기 차단
  } catch (e) {
    if ((e as { code?: string }).code !== "EEXIST") throw e;
    rmSync(tmp, { force: true }); // 잔여 tmp/선점물 제거 후 배타 재생성
    writeFileSync(tmp, content, { mode, flag: "wx" });
  }
  chmodSync(tmp, mode);
  renameSync(tmp, path);
}

export function writeManagedConfig(content: string): void {
  mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 });
  writeFileAtomicNoSymlink(MANAGED_CONFIG_PATH, content, 0o600);
}

export function readAllHosts(): { managed: string[]; config: string[] } {
  const main = existsSync(MAIN_CONFIG_PATH)
    ? readFileSync(MAIN_CONFIG_PATH, "utf8")
    : "";
  return {
    managed: parseHostAliases(readManagedConfig()),
    config: parseHostAliases(main),
  };
}

/**
 * 딥링크로 유입된 host의 신뢰 검증 — 사용자가 실제로 등록·사용한 host 집합에 속하는지 확인한다.
 * known 집합 = managed ∪ recents ∪ ~/.ssh/config ∪ additionalHosts (hideConfigHosts와 무관 —
 * 그건 UI 정돈 취향일 뿐 신뢰 경계가 아니다). 조작된 raycast:// 딥링크가 임의 host로
 * 클립보드 이미지를 전송하는 confused-deputy 유출을 차단한다. isValidHost(구문) 이후의 2차 관문.
 */
export async function isKnownHost(host: string): Promise<boolean> {
  try {
    const { managed, config } = readAllHosts();
    const known = mergeHosts(
      await getRecents(),
      managed,
      config,
      parseAdditionalHosts(prefs().additionalHosts),
    );
    return known.some((e) => e.name === host);
  } catch (e) {
    // fail-closed: 신뢰 목록을 못 읽으면(권한 변경 등) 미지 host로 간주해 전송을 거부한다.
    // 침묵 크래시 대신 안전 거부 — 관문이 열리는 fail-open을 원천 차단.
    console.error("isKnownHost failed:", e);
    return false;
  }
}

/**
 * 딥링크 host 신뢰 관문 — known 집합에 없으면 "Unknown server" 토스트 후 false.
 * 딥링크 소비 지점(send-clipboard-image·pull-file)이 공유하는 단일 관문.
 * 새 딥링크 소비 커맨드도 반드시 이 관문을 통과시켜 관문 누락을 예방한다.
 */
export async function ensureKnownHost(host: string): Promise<boolean> {
  if (await isKnownHost(host)) return true;
  await showToast({
    style: Toast.Style.Failure,
    title: "Unknown server",
    message: `${host} isn't in your server list. Add it in Add Server or ~/.ssh/config first.`,
  });
  return false;
}

export function includePresent(): boolean {
  if (!existsSync(MAIN_CONFIG_PATH)) return false;
  return !ensureIncludeContent(readFileSync(MAIN_CONFIG_PATH, "utf8")).changed;
}

/** 메인 config 백업 후 Include 1줄을 선두에 추가 — 호출 전 반드시 사용자 동의를 받는다 */
export function addIncludeLine(): void {
  mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 });
  const prev = existsSync(MAIN_CONFIG_PATH)
    ? readFileSync(MAIN_CONFIG_PATH, "utf8")
    : "";
  if (existsSync(MAIN_CONFIG_PATH)) {
    copyFileSync(
      MAIN_CONFIG_PATH,
      `${MAIN_CONFIG_PATH}.ssh-image-drop-backup-${Date.now()}`,
    );
  }
  writeFileAtomicNoSymlink(
    MAIN_CONFIG_PATH,
    ensureIncludeContent(prev).content,
    0o600,
  );
}

// ---------- clipboard ----------

const PNG_APPLESCRIPT = `on run argv
    set outPath to item 1 of argv
    set pngData to the clipboard as «class PNGf»
    set fileRef to open for access (POSIX file outPath) with write permission
    set eof of fileRef to 0
    write pngData to fileRef
    close access fileRef
end run`;

async function extractClipboardPng(): Promise<string> {
  // 예측 가능한 tmp 이름 대신 0700 임시 디렉토리 안에 저장 — 동일 사용자 race·symlink 선점 방지
  const dir = mkdtempSync(join(tmpdir(), "ssh-image-drop-"));
  const out = join(dir, "clipboard.png");
  try {
    await execFileP(OSASCRIPT, ["-e", PNG_APPLESCRIPT, out]);
  } catch {
    rmSync(dir, { recursive: true, force: true });
    throw new Error("NO_IMAGE");
  }
  return out;
}

/** 셀렉터 위임 전 clipboard에 이미지가 있는지 가벼운 확인 (없으면 서버 고르는 낭비 방지). 실패는 false로 접는다. */
export async function clipboardHasImage(): Promise<boolean> {
  try {
    const p = await extractClipboardPng();
    rmSync(dirname(p), { recursive: true, force: true }); // 프로브용 임시 디렉토리 즉시 정리
    return true;
  } catch {
    return false;
  }
}

// ---------- askpass / keychain ----------

function ensureAskpassHelper(): string {
  mkdirSync(environment.supportPath, { recursive: true });
  const helperPath = join(environment.supportPath, "askpass.sh");
  writeFileSync(helperPath, ASKPASS_SCRIPT, { mode: 0o755 });
  chmodSync(helperPath, 0o755); // 기존 파일에는 writeFileSync mode가 무시됨 — 실행 권한 보정
  return helperPath;
}

function askpassBaseEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    SSH_ASKPASS: ensureAskpassHelper(),
    SSH_ASKPASS_REQUIRE: "force",
    DISPLAY: ":0",
  };
}

function keychainEnv(alias: string): NodeJS.ProcessEnv {
  return { ...askpassBaseEnv(), SSH_IMAGE_DROP_ALIAS: alias };
}

/**
 * 1회용 PW를 FIFO로 askpass에 전달 — 디스크 기록 없음, 사용 후 디렉토리째 제거.
 * finally에서 O_NONBLOCK 읽기로 FIFO를 반드시 drain — ssh가 askpass를 한 번도 호출하지 않고
 * 죽으면 writer의 FIFO open이 영구 블록되어 libuv 스레드가 누수되기 때문. (blocking read로
 * 풀면 writer가 이미 소진된 케이스에서 반대 방향 데드락이 나므로 NONBLOCK이어야 한다)
 */
async function withPasswordPipe<T>(
  password: string,
  fn: (env: NodeJS.ProcessEnv) => Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "ssh-image-drop-"));
  const pipe = join(dir, "pw");
  await execFileP(MKFIFO, ["-m", "600", pipe]);
  const { writeFile } = await import("fs/promises");
  const writer = writeFile(pipe, password).catch(() => undefined);
  try {
    return await fn({ ...askpassBaseEnv(), SSH_IMAGE_DROP_PW_PIPE: pipe });
  } finally {
    try {
      // NONBLOCK 읽기 open — 블록된 writer를 깨우거나(첫 open 대기 중), 이미 소진됐으면 즉시 성공
      const fd = openSync(pipe, constants.O_RDONLY | constants.O_NONBLOCK);
      await writer; // 읽기 끝이 열렸으므로 반드시 settle (성공 또는 EPIPE — catch로 흡수됨)
      closeSync(fd);
    } catch {
      await writer; // FIFO가 이미 사라진 경우 등 — writer settle만 보장
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function saveKeychainPassword(
  alias: string,
  password: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(SECURITY, ["-i"], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Keychain save failed: ${stderr.trim()}`)),
    );
    child.stdin.on("error", () => undefined); // security 조기 종료 시 EPIPE — close 핸들러가 실패를 보고
    child.stdin.end(buildAddCommand(alias, password));
  });
}

/** Keychain 항목 삭제. exit 44(항목 없음)는 정상 — key 모드 서버엔 항목이 없다. 그 외 실패는 rethrow. */
export async function deleteKeychainPassword(alias: string): Promise<void> {
  try {
    await execFileP(SECURITY, buildDeleteArgs(alias));
  } catch (e) {
    if ((e as { code?: number }).code === 44) return; // item not found — expected
    throw e;
  }
}

// ---------- key install ----------

async function ensureManagedKey(): Promise<string> {
  if (!existsSync(MANAGED_KEY_PATH)) {
    mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 });
    await execFileP(SSH_KEYGEN, [
      "-t",
      "ed25519",
      "-N",
      "",
      "-f",
      MANAGED_KEY_PATH,
      "-C",
      "ssh-image-drop",
    ]);
  }
  return `${MANAGED_KEY_PATH}.pub`;
}

export async function installKeyWithPassword(
  user: string,
  hostName: string,
  port: string,
  password: string,
): Promise<void> {
  if (!isValidName(user) || !isValidName(hostName) || !isValidPort(port))
    throw new Error("Invalid host, user, or port");
  const pubKey = await ensureManagedKey();
  await withPasswordPipe(password, async (env) => {
    await new Promise<void>((resolve, reject) => {
      // NumberOfPasswordPrompts=1: 1회용 FIFO는 재읽기가 불가 — PW 오류 시 재프롬프트가 두 번째 askpass 호출을 만들어 영구 hang이 되므로 1회로 제한
      const args = [
        "-i",
        pubKey,
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
      ];
      const child = spawn(SSH_COPY_ID, args, {
        env,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Key install failed: ${lastLine(stderr)}`)),
      );
    });
  });
}

// ---------- transfer ----------

function lastLine(s: string): string {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

function sshFailure(stderr: string, mode: AuthMode): Error {
  const s = stderr.toLowerCase();
  if (s.includes("permission denied")) {
    return new Error(
      mode === "key"
        ? "Authentication failed — set up key auth for this host via Add Server"
        : "Authentication failed — re-register the password via Add Server",
    );
  }
  if (s.includes("host key verification failed")) {
    return new Error(
      "Host key verification failed — connect once in a terminal to trust this host",
    );
  }
  return new Error(`Connection failed: ${lastLine(stderr) || "unknown error"}`);
}

/** clipboard PNG를 원격으로 전송. 원격 경로·전송 크기 반환 (스펙 §4.1 toast 형식). 임시 파일은 항상 삭제. */
export async function runSend(
  host: string,
  mode: AuthMode,
  remoteDir: string,
): Promise<{ remotePath: string; bytes: number }> {
  if (!isValidHost(host)) throw new Error("Invalid host");
  if (!isSafeRemoteDir(remoteDir))
    throw new Error(
      "Invalid Remote Directory — use an absolute path or ~/path (check preferences).",
    );
  const localPng = await extractClipboardPng();
  try {
    const bytes = statSync(localPng).size;
    const dir = remoteDir.replace(/\/+$/, "");
    const fileName = remoteFileName(new Date());
    const args = buildSendArgs(host, dir, fileName, mode);
    const env = mode === "keychain" ? keychainEnv(host) : process.env;
    await new Promise<void>((resolve, reject) => {
      const child = spawn(SSH, args, {
        env,
        stdio: ["pipe", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(sshFailure(stderr, mode)),
      );
      child.stdin.on("error", () => undefined); // ssh 조기 종료 시 EPIPE — close 핸들러가 실패를 보고하므로 crash만 방지
      createReadStream(localPng)
        .on("error", (e) => {
          child.kill();
          reject(e);
        })
        .pipe(child.stdin);
    });
    return { remotePath: `${dir}/${fileName}`, bytes };
  } finally {
    rmSync(dirname(localPng), { recursive: true, force: true });
  }
}

/**
 * Pull 대상이 폴더면 사용자 확인을 받는다 — 대용량 재귀 다운로드 오발동 방지.
 * 반환 false = 진행 중단 (사용자 취소 또는 접속 실패 — 후자는 여기서 실패 토스트).
 * 파일·부재(test -d exit 1)만 확인 없이 진행 — 실제 오류는 scp가 정확한 메시지로 실패한다.
 * 접속·인증 실패(exit 255 등)는 폴더 여부 판별 불가이므로 fail-closed — 판별 실패 상태로
 * 진행하면 폴더 confirm 게이트가 무력화된 채 대량 pull이 될 수 있다.
 */
export async function confirmFolderPull(
  host: string,
  mode: AuthMode,
  remotePath: string,
): Promise<boolean> {
  const env = mode === "keychain" ? keychainEnv(host) : process.env;
  try {
    await execFileP(SSH, buildIsDirArgs(host, remotePath, mode), { env });
  } catch (e) {
    if ((e as { code?: number }).code === 1) return true; // 파일·부재 — 확인 불필요
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Pull from ${host} failed`,
      message: sshFailure(stderr, mode).message,
    });
    return false;
  }
  return confirmAlert({
    title: "Pull entire folder?",
    message: `"${remoteBasename(remotePath)}" is a folder — everything inside will be downloaded from ${host}.`,
    primaryAction: { title: "Pull Folder" },
  });
}

/** 원격 파일/폴더를 다운로드 디렉토리로 수신하고 로컬 경로 반환. 실패 시 부분 산출물 삭제. */
export async function runPull(
  host: string,
  mode: AuthMode,
  remotePath: string,
  downloadDirPref: string,
): Promise<string> {
  if (!isValidHost(host)) throw new Error("Invalid host");
  const pathError = validateRemotePath(remotePath);
  if (pathError) throw new Error(pathError);
  const dir = expandTilde(downloadDirPref);
  mkdirSync(dir, { recursive: true });
  const name = pickAvailableName(remoteBasename(remotePath), (n) =>
    existsSync(join(dir, n)),
  );
  const localPath = join(dir, name);
  const env = mode === "keychain" ? keychainEnv(host) : process.env;
  try {
    await execFileP(SCP, buildPullArgs(host, remotePath, localPath, mode), {
      env,
    });
  } catch (e) {
    // 폴더 pull(-r) 부분 실패 시 디렉토리째 정리
    rmSync(localPath, { recursive: true, force: true });
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    throw sshFailure(stderr, mode);
  }
  return localPath;
}

export interface SendFilesResult {
  succeeded: { local: string; remote: string }[];
  skipped: string[];
  failed: { local: string; error: string }[];
  /** 전송 대상 중 폴더 수 — 결과 문구의 file/item 단위 선택용 */
  folders: number;
}

/**
 * Finder 선택에 폴더가 있으면 재귀 업로드 여부를 사용자 확인 — 대용량 오발동 방지.
 * 반환 false = 사용자가 취소. 폴더 없으면 확인 없이 true.
 */
export async function confirmFolderSend(
  localPaths: string[],
  host: string,
): Promise<boolean> {
  const dirs = localPaths.filter((p) => {
    try {
      return statSync(p).isDirectory();
    } catch {
      return false; // stat 실패는 runSendFiles가 failed로 보고
    }
  });
  if (dirs.length === 0) return true;
  return confirmAlert({
    title: dirs.length === 1 ? "Send entire folder?" : "Send entire folders?",
    // 동명 폴더 중첩은 scp -r 표준 semantics — 재전송 시 혼동 방지 위해 사전 고지
    message:
      `${dirs.length === 1 ? `"${remoteBasename(dirs[0])}" is a folder` : `${dirs.length} folders selected`} — everything inside will be uploaded to ${host}. ` +
      `If a folder with the same name already exists there, files are copied into it.`,
    primaryAction: { title: "Send" },
  });
}

/**
 * Finder 다중 파일/폴더 전송. 원격 mkdir 1회(실패 시 배치 전체 중단) 후 항목당 scp 순차 실행.
 * 비정규 파일(FIFO·socket 등)은 skip, 개별 전송 실패는 나머지를 막지 않고 수집한다.
 */
export async function runSendFiles(
  host: string,
  mode: AuthMode,
  localPaths: string[],
  remoteDir: string,
): Promise<SendFilesResult> {
  if (!isValidHost(host)) throw new Error("Invalid host");
  if (!isSafeRemoteDir(remoteDir))
    throw new Error(
      "Invalid Remote Directory — use an absolute path or ~/path (check preferences).",
    );
  const dir = remoteDir.replace(/\/+$/, "");
  const env = mode === "keychain" ? keychainEnv(host) : process.env;
  const result: SendFilesResult = {
    succeeded: [],
    skipped: [],
    failed: [],
    folders: 0,
  };

  // 1-pass 분류 — statSync 실패는 failed, 비정규(FIFO·socket 등)는 skipped(심링크 follow), 나머지는 전송 대상
  const transferable: string[] = [];
  const dirPaths = new Set<string>();
  for (const local of localPaths) {
    let st;
    try {
      st = statSync(local);
    } catch (e) {
      result.failed.push({ local, error: (e as Error).message });
      continue;
    }
    // 파일/폴더이면서 basename이 안전한 경우만 전송 — 원격 경로 <dir>/<basename> 주입 방지
    if (isTransferable(st) && isSafeBasename(remoteBasename(local))) {
      transferable.push(local);
      if (st.isDirectory()) dirPaths.add(local);
    } else result.skipped.push(local);
  }

  // 배치 내 동일 basename 충돌 제거 — 후행이 선행을 덮어써 silent 손실·중복 성공 오보고되는 것 방지.
  // dropped는 전송하지 않고 skip으로 정직하게 보고한다.
  const { kept, dropped } = dedupeByBasename(transferable);
  for (const local of dropped) result.skipped.push(local);
  result.folders = kept.filter((p) => dirPaths.has(p)).length;

  // 전송 대상 0개 → 원격 mkdir 없이 즉시 반환 (§5.2: 유효 파일 0개면 전송 없음)
  if (kept.length === 0) return result;

  // 원격 디렉토리 선행 준비 — 실패는 배치 전체 중단(scp 진입 안 함)
  try {
    await execFileP(SSH, buildMkdirArgs(host, dir, mode), { env });
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    throw sshFailure(stderr, mode);
  }

  for (const local of kept) {
    try {
      await execFileP(SCP, buildSendFileArgs(host, dir, local, mode), { env });
      result.succeeded.push({
        local,
        remote: `${dir}/${remoteBasename(local)}`,
      });
    } catch (e) {
      const stderr = (e as { stderr?: string }).stderr ?? String(e);
      result.failed.push({ local, error: sshFailure(stderr, mode).message });
    }
  }
  return result;
}

export async function revealInFinder(p: string): Promise<void> {
  await execFileP(OPEN, ["-R", p]);
}
