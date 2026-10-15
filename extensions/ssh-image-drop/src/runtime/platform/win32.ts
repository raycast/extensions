import { Clipboard, environment } from "@raycast/api";
import { execFile, spawn } from "child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import {
  buildInstallKeyArgs,
  buildInstallKeyCommand,
} from "../../lib/installKeyCmd";
import {
  ASKPASS_BAT,
  ASKPASS_PS1,
  CLIPBOARD_PNG_PS,
  CLIPBOARD_TEXT_PS,
  credBlobFileName,
  DPAPI_SAVE_PS,
  toBase64Utf8,
} from "../../lib/winScripts";
import { lastLine, PlatformAdapter } from "./types";

const execFileP = promisify(execFile);

// 절대경로 고정 — PATH 주입 방지 (Mac의 /usr/bin/* 불변식과 동일).
// OpenSSH 클라이언트는 Windows 10 1809+ 기본 탑재
const OPENSSH_DIR = "C:\\Windows\\System32\\OpenSSH";
const SSH = join(OPENSSH_DIR, "ssh.exe");
const SCP = join(OPENSSH_DIR, "scp.exe");
const SSH_KEYGEN = join(OPENSSH_DIR, "ssh-keygen.exe");
const POWERSHELL =
  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const EXPLORER = "C:\\Windows\\explorer.exe";

/**
 * Raycast Windows 런타임의 process.env에는 표준 Windows 변수 대부분이 빠져 있다
 * (실측 18개 키 — HOME·PATH·TEMP 정도만 존재). 특히 **ProgramData 부재는
 * Win32-OpenSSH를 로깅 초기화 이전에 죽여 stderr 한 줄 없이 exit 255**를 만든다
 * (env 이분탐색으로 특정). 모든 자식 프로세스 spawn은 반드시 이 보정 env를 기반으로 한다.
 */
function winBaseEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  env.SystemRoot ??= "C:\\Windows";
  env.windir ??= env.SystemRoot;
  env.SystemDrive ??= "C:";
  env.ProgramData ??= "C:\\ProgramData"; // ssh.exe 기동 필수 — 없으면 무출력 exit 255
  env.ALLUSERSPROFILE ??= env.ProgramData;
  env.USERPROFILE ??= homedir();
  env.ComSpec ??= join(env.SystemRoot, "System32", "cmd.exe");
  env.TMP ??= env.TEMP; // TEMP만 있고 TMP는 없음 — CRT 폴백 정합
  return env;
}

/** supportPath에 헬퍼 스크립트 설치(멱등 재작성) 후 경로 반환 — Mac ensureAskpassHelper 패턴 */
function ensureHelper(name: string, content: string): string {
  mkdirSync(environment.supportPath, { recursive: true });
  const p = join(environment.supportPath, name);
  writeFileSync(p, content);
  return p;
}

/**
 * 헬퍼를 -File로 실행 — 가변 인자는 전부 $args로 전달해 -Command 문자열 조립의 escaping 문제 회피.
 * -STA: WinForms 클립보드 API 요구. -NonInteractive: 프롬프트 대기로 인한 hang 방지.
 */
async function runHelper(
  name: string,
  content: string,
  args: string[],
): Promise<string> {
  const { stdout } = await execFileP(
    POWERSHELL,
    [
      "-NoProfile",
      "-NonInteractive",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ensureHelper(name, content),
      ...args,
    ],
    { env: winBaseEnv() },
  );
  return stdout;
}

function credsDir(): string {
  const dir = join(environment.supportPath, "credentials");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function credBlobPath(alias: string): string {
  return join(credsDir(), credBlobFileName(alias));
}

function askpassBaseEnv(): NodeJS.ProcessEnv {
  ensureHelper("askpass.ps1", ASKPASS_PS1);
  return {
    ...winBaseEnv(),
    SSH_ASKPASS: ensureHelper("askpass.bat", ASKPASS_BAT),
    SSH_ASKPASS_REQUIRE: "force", // TTY 유무와 무관하게 askpass 강제 — Raycast(무콘솔)·터미널 양쪽 커버
    DISPLAY: ":0",
  };
}

/**
 * PW를 DPAPI(사용자 단위 암호화) blob으로 기록 — 평문은 stdin의 base64로만 전달(argv·디스크 비노출).
 * base64 경유 이유는 winScripts.DPAPI_SAVE_PS 주석 참조 (콘솔 codepage로 비ASCII 깨짐 방지).
 */
async function savePasswordBlob(path: string, password: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      POWERSHELL,
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ensureHelper("dpapi-save.ps1", DPAPI_SAVE_PS),
        path,
      ],
      { stdio: ["pipe", "ignore", "pipe"], env: winBaseEnv() },
    );
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Credential save failed: ${lastLine(stderr)}`)),
    );
    child.stdin.on("error", () => undefined); // 조기 종료 시 EPIPE — close 핸들러가 실패를 보고
    child.stdin.end(toBase64Utf8(password));
  });
}

/** 1회용 PW blob 임시 디렉토리 접두 — 일반 임시 디렉토리(클립보드 등)와 구분해 안전히 청소 */
const OTP_PREFIX = "ssh-image-drop-otp-";

/**
 * 크래시·강제 종료로 finally가 실행되지 못해 잔존한 1회용 DPAPI blob 청소 (best-effort).
 * "한 번 쓰고 폐기" 약속 유지 목적. 5분 이상 지난 것만 — 동시 진행 중인 키 설치 보호.
 */
function sweepStaleOneTimeBlobs(): void {
  try {
    const t = tmpdir();
    for (const name of readdirSync(t)) {
      if (!name.startsWith(OTP_PREFIX)) continue;
      const p = join(t, name);
      try {
        if (Date.now() - statSync(p).mtimeMs > 5 * 60_000)
          rmSync(p, { recursive: true, force: true });
      } catch {
        // best-effort — 다른 프로세스가 먼저 지웠거나 잠금 중이면 다음 기회에
      }
    }
  } catch {
    // tmpdir 자체 접근 실패 — 청소는 부가 기능이므로 무시
  }
}

export const win32Adapter: PlatformAdapter = {
  ssh: SSH,
  scp: SCP,
  sshKeygen: SSH_KEYGEN,

  // Raycast for Windows에는 Explorer 선택 읽기 API가 없다(2026-07 기준) — 폼 프리필 불가, picker 2필드
  supportsFileSelection: false,
  credentialStoreName: "Windows encrypted store (DPAPI)",
  captureHint: "Win+Shift+S",
  fileManagerName: "Explorer",
  manualKeyInstallHint(user, hostName) {
    return `run type %USERPROFILE%\\.ssh\\ssh_image_drop_ed25519.pub | ssh ${user}@${hostName} "cat >> ~/.ssh/authorized_keys" in a terminal, then add the server again in Manage Servers.`;
  },
  credentialRemovalHint:
    'Delete the "credentials" folder entry in the extension support directory.',

  baseEnv(): NodeJS.ProcessEnv {
    sweepStaleOneTimeBlobs(); // 일반 전송(key 모드) 진입 시에도 크래시 잔존 blob 청소
    return winBaseEnv();
  },

  async extractClipboardPng(): Promise<string> {
    // 사용자 프로필 하위 임시 디렉토리(기본 ACL이 사용자 전용) — Mac의 0700 mkdtemp와 동등
    const dir = mkdtempSync(join(tmpdir(), "ssh-image-drop-"));
    const out = join(dir, "clipboard.png");
    try {
      await runHelper("clipboard-png.ps1", CLIPBOARD_PNG_PS, [out]);
    } catch {
      rmSync(dir, { recursive: true, force: true });
      throw new Error("NO_IMAGE");
    }
    return out;
  },

  /**
   * Raycast Windows의 Clipboard.readText()는 외부 프로세스가 갓 복사한 텍스트를 놓쳐 빈 값을
   * 반환하는 경우가 있다(실측 — pull 2회차 "No remote path" 오진의 원인). 이미지 추출과 동일하게
   * 시스템 클립보드를 PowerShell로 직접 읽고, 헬퍼 실행 실패 시에만 Raycast API로 폴백.
   */
  async readClipboardText(): Promise<string> {
    try {
      return await runHelper("clipboard-text.ps1", CLIPBOARD_TEXT_PS, []);
    } catch {
      return (await Clipboard.readText()) ?? "";
    }
  },

  async savePassword(alias: string, password: string): Promise<void> {
    await savePasswordBlob(credBlobPath(alias), password);
  },

  async deletePassword(alias: string): Promise<void> {
    rmSync(credBlobPath(alias), { force: true }); // force: 항목 없음도 성공 — Mac exit 44 처리와 동등한 멱등성
    rmSync(`${credBlobPath(alias)}.tmp`, { force: true }); // 저장 실패로 남은 임시 blob도 함께
  },

  credentialEnv(alias: string): NodeJS.ProcessEnv {
    sweepStaleOneTimeBlobs(); // 일반 전송(PW 모드) 진입 시에도 크래시 잔존 blob 청소
    return { ...askpassBaseEnv(), SSH_IMAGE_DROP_CRED: credBlobPath(alias) };
  },

  /**
   * 1회용 PW — 영구 저장과 동일한 DPAPI blob 경로를 임시 디렉토리에 만들어 재사용(코드 경로 단일화).
   * Mac FIFO와 달리 암호문이 수 초간 디스크를 스치지만 평문 비노출 불변식은 유지되며,
   * finally에서 디렉토리째 제거한다. (named pipe 대비 단순성 우선)
   * 크래시로 finally가 못 돈 잔존 blob은 다음 호출의 sweepStaleOneTimeBlobs가 청소한다.
   */
  async withOneTimePassword<T>(
    password: string,
    fn: (env: NodeJS.ProcessEnv) => Promise<T>,
  ): Promise<T> {
    sweepStaleOneTimeBlobs();
    const dir = mkdtempSync(join(tmpdir(), OTP_PREFIX));
    const blob = join(dir, "onetime.dpapi");
    try {
      await savePasswordBlob(blob, password);
      return await fn({ ...askpassBaseEnv(), SSH_IMAGE_DROP_CRED: blob });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },

  /** ssh-copy-id 부재 대체 — 원격 sh 원라이너로 공개키 멱등 추가 (lib/installKeyCmd) */
  async installKey(
    pubKeyPath: string,
    user: string,
    hostName: string,
    port: string,
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    const pubKey = readFileSync(pubKeyPath, "utf8");
    const args = buildInstallKeyArgs(
      user,
      hostName,
      port,
      buildInstallKeyCommand(pubKey),
    );
    await new Promise<void>((resolve, reject) => {
      const child = spawn(SSH, args, {
        env,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) return resolve();
        // 원본 stderr를 실어 보낸다 — 상위(installKeyWithPassword)가 Windows 서버 감지에 사용
        const err = new Error(`Key install failed: ${lastLine(stderr)}`);
        (err as { stderr?: string }).stderr = stderr;
        reject(err);
      });
    });
  },

  async revealInFileManager(p: string): Promise<void> {
    // explorer.exe는 성공해도 비0 종료가 흔하다 — 종료 코드는 판정에 쓰지 않고 spawn 실패만 감지
    await new Promise<void>((resolve, reject) => {
      const child = spawn(EXPLORER, [`/select,${p}`], {
        stdio: "ignore",
        env: winBaseEnv(),
      });
      child.on("error", reject);
      child.on("spawn", () => resolve());
    });
  },
};
