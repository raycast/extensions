import {
  Application,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  environment,
  getFrontmostApplication,
  showToast,
  Toast,
} from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { spawn } from "child_process";
import {
  chmodSync,
  copyFileSync,
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { promisify } from "util";
import {
  ensureIncludeContent,
  ManagedEntry,
  parseHostAliases,
  parseManagedEntry,
} from "../lib/sshConfigText";
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
import { mergeHosts } from "../lib/mergeHosts";
import {
  looksLikeWindowsServer,
  WINDOWS_SERVER_MESSAGE,
} from "../lib/serverKind";
import {
  AppRef,
  basenameIssue,
  clipboardImageSizeIssue,
  expandTilde,
  isPasteSafePath,
  isSameApp,
  isSafeRemoteDir,
  isValidHost,
  isValidName,
  isValidPort,
  localBasename,
  remoteBasename,
  sanitizeLocalName,
  validateRemotePath,
} from "../lib/validate";
import { lastLine, platform } from "./platform";
import { getRecents } from "./store";

const execFileP = promisify(execFile);

const SSH_DIR = join(homedir(), ".ssh");
export const MAIN_CONFIG_PATH = join(SSH_DIR, "config");
const MANAGED_CONFIG_PATH = join(SSH_DIR, "ssh_image_drop_config");
export const MANAGED_KEY_PATH = join(SSH_DIR, "ssh_image_drop_ed25519");

/**
 * managed config에 기록할 IdentityFile 값. Windows 경로는 구분자를 `/`로 통일하고
 * (ssh_config에서 `\`는 escape 문자) 공백 포함 시 quote — Mac은 원 경로 그대로.
 */
export function managedKeyConfigValue(): string {
  if (process.platform !== "win32") return MANAGED_KEY_PATH;
  const p = MANAGED_KEY_PATH.replace(/\\/g, "/");
  return /\s/.test(p) ? `"${p}"` : p;
}

/**
 * 정규화된 preference. 원본에서 remoteDir·downloadDir은 미입력 시 undefined지만(placeholder만
 * 보임), prefs()를 통과하면 항상 값을 갖는다 — placeholder에 적힌 값이 곧 실제 폴백이다.
 * 생성 타입과의 교집합으로 선언해 manifest에 항목이 늘어도 그대로 따라간다.
 */
type NormalizedPrefs = Preferences & { remoteDir: string; downloadDir: string };

export function prefs(): NormalizedPrefs {
  // 자동 생성 타입(raycast-env.d.ts) 사용 — manifest 변경 시 수동 interface가 어긋나는 드리프트 방지
  const p = getPreferenceValues<Preferences>();
  const rawDownloadDir = p.downloadDir?.trim() || "";
  // `/`·`~/`·bare `~` 허용 — `~foo`·상대경로가 Raycast cwd에 리터럴 디렉토리를 만드는 것 방지.
  // Windows는 드라이브 절대경로(C:\ / C:/)도 허용.
  const downloadDirOk =
    /^(\/|~\/|~$)/.test(rawDownloadDir) ||
    (process.platform === "win32" && /^[A-Za-z]:[\\/]/.test(rawDownloadDir));
  return {
    // 미설정 시에만 기본값. 설정된 값은 그대로 전달하고 전송 진입점(runSend/runSendFiles)에서
    // isSafeRemoteDir로 검증·거부한다 — 불안전값을 공유 /tmp로 무고지 폴백(fail-open)하지 않기 위함
    remoteDir: p.remoteDir?.trim().replace(/\/+$/, "") || "/tmp/ssh-image-drop",
    downloadDir: downloadDirOk ? rawDownloadDir : "~/Downloads",
    hideConfigHosts: p.hideConfigHosts ?? true,
    pasteTargetApp: p.pasteTargetApp,
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
 * (Windows: mode/chmod는 무해한 no-op — 사용자 프로필 기본 ACL이 접근을 제한한다)
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

/** Edit prefill용 — managed config에서 alias의 HostName/User/Port를 읽는다. 관리 서버가 아니면 null */
export function getManagedEntry(alias: string): ManagedEntry | null {
  return parseManagedEntry(readManagedConfig(), alias);
}

/**
 * 딥링크로 유입된 host의 신뢰 검증 — 사용자가 실제로 등록·사용한 host 집합에 속하는지 확인한다.
 * known 집합 = managed ∪ recents ∪ ~/.ssh/config (hideConfigHosts와 무관 —
 * 그건 UI 정돈 취향일 뿐 신뢰 경계가 아니다). 조작된 raycast:// 딥링크가 임의 host로
 * 클립보드 이미지를 전송하는 confused-deputy 유출을 차단한다. isValidHost(구문) 이후의 2차 관문.
 */
export async function isKnownHost(host: string): Promise<boolean> {
  try {
    const { managed, config } = readAllHosts();
    const known = mergeHosts(await getRecents(), managed, config);
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
    message: `${host} isn't in your server list. Add it in Manage Servers or ~/.ssh/config first.`,
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

/** 셀렉터 위임 전 clipboard에 이미지가 있는지 가벼운 확인 (없으면 서버 고르는 낭비 방지). 실패는 false로 접는다. */
export async function clipboardHasImage(): Promise<boolean> {
  try {
    const p = await platform.extractClipboardPng();
    rmSync(dirname(p), { recursive: true, force: true }); // 프로브용 임시 디렉토리 즉시 정리
    return true;
  } catch {
    return false;
  }
}

/** 클립보드 텍스트 (없으면 "") — pull의 원격 경로 취득용. 플랫폼 이슈는 어댑터 주석 참조 */
export async function readClipboardText(): Promise<string> {
  return platform.readClipboardText();
}

/**
 * closeMainWindow() 반환은 직전 앱으로의 포커스 복원 완료를 보장하지 않는다. 고정 대기는
 * 머신·부하마다 빗나가 붙여넣기가 조용히 생략되므로(안전측 실패), 지정 앱이 잡힐 때까지
 * 짧게 재확인하고 상한에서 포기한다. 일치하면 즉시 빠져나오므로 정상 경로의 지연은 1회분이다.
 */
const FOCUS_RESTORE_STEP_MS = 60;
const FOCUS_RESTORE_TRIES = 8;
/**
 * no-view는 실행 시점에 창이 이미 닫혀 재확인이 거의 불필요하지만 0회는 마진이 없다 —
 * 루트 검색에서 실행돼 창이 막 닫힌 직후 전송까지 빨리 끝나면 복원 전 상태를 잡을 수 있다.
 * 1회분만 남겨 무동작을 막되, 대상 아닌 앱에서의 헛대기는 60ms로 묶는다.
 */
const FOCUS_RESTORE_TRIES_NO_VIEW = 2;

/**
 * 창을 닫은 뒤 안정화된 최상위 앱. 지정 앱과 일치하면 즉시 반환하고, 상한까지 못 잡으면
 * 마지막 관측값을 돌려준다.
 *
 * 재확인은 View 커맨드에서만 한다. 목록이 떠 있는 상태로 창을 닫으면 포커스가 직전 앱으로
 * 돌아오는 데 시간이 걸리기 때문이다. no-view 커맨드는 실행 시점에 이미 창이 닫혀 전송이 도는
 * 수 초 동안 포커스가 확정돼 있으므로 재확인이 순수 낭비이고, 지정 앱이 아닌 곳에서 실행하면
 * 상한까지 헛돌아 완료 알림만 늦어진다.
 * (View 경로에서 지정 앱이 아닐 때 상한만큼 기다리는 것은 남는다 — 그 경로는 목록 조작이
 * 선행하므로 체감 비중이 낮다고 보고 감수한다.)
 */
async function frontmostAfterClose(target: AppRef): Promise<Application> {
  const tries =
    environment.commandMode === "view"
      ? FOCUS_RESTORE_TRIES
      : FOCUS_RESTORE_TRIES_NO_VIEW;
  let current = await getFrontmostApplication();
  for (let i = 1; i < tries && !isSameApp(target, current); i++) {
    await new Promise((r) => setTimeout(r, FOCUS_RESTORE_STEP_MS));
    current = await getFrontmostApplication();
  }
  return current;
}

/**
 * 붙여넣기 대상 앱. preference를 못 읽으면 기능 미설정과 동일하게 취급한다 — 경로 복사는 이미
 * 끝났으므로, 켠 적 없는 사용자에게 "붙여넣기 실패"를 보고하는 쪽이 사실과 더 멀다.
 */
function pasteTargetApp(): AppRef | undefined {
  try {
    return prefs().pasteTargetApp;
  } catch {
    return undefined;
  }
}

/**
 * 클립보드 이미지의 원격 경로를 사용자에게 전달한다 (이 경로 전용 — 파일 전송·pull은 copy만 한다).
 * copy를 항상 선행 — 붙여넣기가 생략·실패해도 경로는 클립보드에서 회수할 수 있어야 한다.
 *
 * 판정 순서가 중요하다. View 커맨드에서는 서버 목록이 떠 있어 frontmost가 Raycast로 읽힐 수
 * 있으므로, **창을 먼저 닫고 포커스가 복원된 뒤에** 최상위 앱을 샘플링한다. 순서를 뒤집으면
 * 지정 앱과 영영 일치하지 않아 기능이 무동작한다. 샘플링을 paste 직전에 붙여 앱 전환 레이스를
 * 줄이지만 없애지는 못한다 — 샘플과 paste 사이 전환은 여전히 가능하다.
 *
 * 반환값은 HUD에 덧붙일 문구 — **기대에서 벗어난 결과에만** 붙인다. 붙여넣기 성공과 기능
 * 미사용은 둘 다 빈 문자열이다: 성공은 경로가 들어오는 것을 사용자가 직접 보므로 알릴 것이
 * 없고, 미사용 시에는 기존 HUD 문구가 그대로 유지되어야 한다.
 */
export async function deliverPath(text: string): Promise<string> {
  // 복사 성공 여부를 catch에서 알아야 한다 — 실패했는데 "path copied"라고 하면 거짓 보고다
  let copied = false;
  try {
    await Clipboard.copy(text);
    copied = true;
    const target = pasteTargetApp();
    // 미설정이면 복사만. 플랫폼 분기는 두지 않는다 — Windows 실기에서 appPicker 렌더링과
    // getFrontmostApplication·Clipboard.paste 동작을 확인했고, 앱 동일성은 isSameApp이
    // windowsAppId를 1순위로 비교해 이미 흡수한다.
    if (!target) return "";
    if (!isPasteSafePath(text)) return " — path copied";
    await closeMainWindow();
    // 지정 앱이 최상위가 아님 — 사용자는 자기가 어느 앱에 있는지 알므로 감지된 앱은 알리지 않는다
    if (!isSameApp(target, await frontmostAfterClose(target)))
      return " — path copied";
    await Clipboard.paste(text);
    // 성공은 침묵 — 경로가 들어오는 것을 사용자가 직접 본다. 게다가 paste가 실제로 꽂혔는지
    // 확인할 방법이 없어(권한 거부 시 무음 no-op 가능) "붙여넣었다"고 단언할 근거가 없다.
    return "";
  } catch {
    // 전달 단계의 예외를 전파하면 호출부 catch가 이미 성공한 전송을 실패로 보고한다.
    // 전송은 끝났으므로 여기서 흡수하고, 사용자가 경로를 회수할 수 있는지만 정확히 알린다.
    return copied
      ? " — couldn't paste, path copied"
      : " — couldn't copy the path";
  }
}

/**
 * pull 성공 후 로컬 경로 전달(클립보드 복사 + 파일 관리자 reveal).
 * 예외를 전파하지 않는다 — 다운로드는 이미 끝났으므로 호출부 catch가 pull 실패로
 * 보고하면 안 된다. HUD에 덧붙일 접미사만 반환한다.
 */
export async function deliverPulledPath(localPath: string): Promise<string> {
  let copied = false;
  try {
    await Clipboard.copy(localPath);
    copied = true;
  } catch {
    // 복사 실패는 접미사로만 알린다 — 파일은 이미 받아 있다
  }
  await revealInFinder(localPath).catch(() => undefined);
  return copied ? "" : " — couldn't copy the path";
}

// ---------- credentials / key install ----------

/** alias의 PW를 OS 자격증명 저장소에 저장 (macOS Keychain / Windows DPAPI blob) */
export async function saveServerPassword(
  alias: string,
  password: string,
): Promise<void> {
  await platform.savePassword(alias, password);
}

/** 저장 PW 삭제 — 항목 없음은 정상(멱등). key 모드 서버엔 항목이 없다. */
export async function deleteServerPassword(alias: string): Promise<void> {
  await platform.deletePassword(alias);
}

async function ensureManagedKey(): Promise<string> {
  if (!existsSync(MANAGED_KEY_PATH)) {
    mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 });
    await execFileP(
      platform.sshKeygen,
      [
        "-t",
        "ed25519",
        "-N",
        "",
        "-f",
        MANAGED_KEY_PATH,
        "-C",
        "ssh-image-drop",
      ],
      { env: platform.baseEnv() },
    );
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
  try {
    await platform.withOneTimePassword(password, (env) =>
      platform.installKey(pubKey, user, hostName, port, env),
    );
  } catch (e) {
    // 원격이 Windows(비POSIX 셸)면 authorized_keys 설치 원라이너가 깨진다 — 명확히 진단.
    // keychain 모드는 등록 시 서버 미접속이라 감지 불가(첫 Send에서 sshFailure가 잡는다).
    const stderr = (e as { stderr?: string }).stderr ?? (e as Error).message;
    if (looksLikeWindowsServer(stderr)) throw new Error(WINDOWS_SERVER_MESSAGE);
    throw e;
  }
}

// ---------- transfer ----------

function sshFailure(stderr: string, mode: AuthMode): Error {
  const s = stderr.toLowerCase();
  if (s.includes("permission denied")) {
    return new Error(
      mode === "key"
        ? "Authentication failed — set up key auth for this host in Manage Servers"
        : "Authentication failed — re-register the password in Manage Servers",
    );
  }
  if (s.includes("host key verification failed")) {
    return new Error(
      "Host key verification failed — connect once in a terminal to trust this host",
    );
  }
  // 인증은 됐으나 원격 셸이 비POSIX(Windows) — 우리 remote 명령이 깨진 경우 명확히 진단.
  // 인증 실패(위)보다 뒤에 둬 인증 단계 에러가 이 문구로 오인되지 않게 한다.
  if (looksLikeWindowsServer(stderr)) return new Error(WINDOWS_SERVER_MESSAGE);
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
  const localPng = await platform.extractClipboardPng();
  try {
    const bytes = statSync(localPng).size;
    // 상한 초과는 전송 시작 전에 거부 — 수백 MB 업로드가 무응답으로 보이는 것 방지
    const sizeIssue = clipboardImageSizeIssue(bytes);
    if (sizeIssue) throw new Error(sizeIssue);
    const dir = remoteDir.replace(/\/+$/, "");
    const fileName = remoteFileName(new Date());
    const args = buildSendArgs(host, dir, fileName, mode);
    const env =
      mode === "keychain" ? platform.credentialEnv(host) : platform.baseEnv();
    await new Promise<void>((resolve, reject) => {
      const child = spawn(platform.ssh, args, {
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
  const env =
    mode === "keychain" ? platform.credentialEnv(host) : platform.baseEnv();
  try {
    await execFileP(platform.ssh, buildIsDirArgs(host, remotePath, mode), {
      env,
    });
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
  // Windows 로컬 저장 시 예약 장치명·ADS 콜론·후행 점 정규화 (원격에선 합법인 이름)
  const safeBase = sanitizeLocalName(
    remoteBasename(remotePath),
    process.platform === "win32",
  );
  const name = pickAvailableName(safeBase, (n) => existsSync(join(dir, n)));
  const localPath = join(dir, name);
  const env =
    mode === "keychain" ? platform.credentialEnv(host) : platform.baseEnv();
  try {
    await execFileP(
      platform.scp,
      buildPullArgs(host, remotePath, localPath, mode),
      { env },
    );
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
  /** reason은 사용자 알림 문구용 — 파일명 문자 등 skip 원인을 명시한다 */
  skipped: { local: string; reason: string }[];
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
      `${dirs.length === 1 ? `"${localBasename(dirs[0])}" is a folder` : `${dirs.length} folders selected`} — everything inside will be uploaded to ${host}. ` +
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
  /** 항목별 scp 시작 직전 호출 — 진행 toast 갱신용 (current는 1부터, total은 실제 전송 대상 수) */
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<SendFilesResult> {
  if (!isValidHost(host)) throw new Error("Invalid host");
  if (!isSafeRemoteDir(remoteDir))
    throw new Error(
      "Invalid Remote Directory — use an absolute path or ~/path (check preferences).",
    );
  const dir = remoteDir.replace(/\/+$/, "");
  const env =
    mode === "keychain" ? platform.credentialEnv(host) : platform.baseEnv();
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
    // 파일/폴더이면서 basename이 안전한 경우만 전송 — 원격 경로 <dir>/<basename> 주입 방지.
    // 로컬 경로이므로 localBasename(`\` 처리) 사용 — remoteBasename이면 Windows 경로 전체가
    // basename이 되어 백슬래시·콜론 때문에 전량 스킵된다. skip 사유는 알림에 노출한다.
    if (!isTransferable(st)) {
      result.skipped.push({ local, reason: "not a file or folder" });
      continue;
    }
    const issue = basenameIssue(localBasename(local));
    if (issue) {
      result.skipped.push({ local, reason: issue });
      continue;
    }
    transferable.push(local);
    if (st.isDirectory()) dirPaths.add(local);
  }

  // 배치 내 동일 basename 충돌 제거 — 후행이 선행을 덮어써 silent 손실·중복 성공 오보고되는 것 방지.
  // dropped는 전송하지 않고 skip으로 정직하게 보고한다.
  const { kept, dropped } = dedupeByBasename(transferable);
  for (const local of dropped)
    result.skipped.push({ local, reason: "duplicate name in batch" });
  result.folders = kept.filter((p) => dirPaths.has(p)).length;

  // 전송 대상 0개 → 원격 mkdir 없이 즉시 반환 (§5.2: 유효 파일 0개면 전송 없음)
  if (kept.length === 0) return result;

  // 원격 디렉토리 선행 준비 — 실패는 배치 전체 중단(scp 진입 안 함)
  try {
    await execFileP(platform.ssh, buildMkdirArgs(host, dir, mode), { env });
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    throw sshFailure(stderr, mode);
  }

  for (const [i, local] of kept.entries()) {
    onProgress?.(i + 1, kept.length, localBasename(local));
    try {
      await execFileP(platform.scp, buildSendFileArgs(host, dir, local, mode), {
        env,
      });
      result.succeeded.push({
        local,
        remote: `${dir}/${localBasename(local)}`,
      });
    } catch (e) {
      const stderr = (e as { stderr?: string }).stderr ?? String(e);
      result.failed.push({ local, error: sshFailure(stderr, mode).message });
    }
  }
  return result;
}

export async function revealInFinder(p: string): Promise<void> {
  await platform.revealInFileManager(p);
}
