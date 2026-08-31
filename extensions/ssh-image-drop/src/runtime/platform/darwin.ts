import { environment, getSelectedText } from "@raycast/api";
import { CLIPBOARD_TEXT_TOO_LARGE } from "../../lib/validate";
import { execFile, spawn } from "child_process";
import {
  chmodSync,
  closeSync,
  constants,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { ASKPASS_SCRIPT } from "../../lib/askpassScript";
import { buildAddCommand, buildDeleteArgs } from "../../lib/keychainCmd";
import { lastLine, PlatformAdapter } from "./types";

const execFileP = promisify(execFile);

const SSH = "/usr/bin/ssh";
const SCP = "/usr/bin/scp";
const OSASCRIPT = "/usr/bin/osascript";
const OPEN = "/usr/bin/open";
const SECURITY = "/usr/bin/security";
const SSH_COPY_ID = "/usr/bin/ssh-copy-id";
const SSH_KEYGEN = "/usr/bin/ssh-keygen";
const MKFIFO = "/usr/bin/mkfifo";
const PBPASTE = "/usr/bin/pbpaste";

const PNG_APPLESCRIPT = `on run argv
    set outPath to item 1 of argv
    set pngData to the clipboard as «class PNGf»
    set fileRef to open for access (POSIX file outPath) with write permission
    set eof of fileRef to 0
    write pngData to fileRef
    close access fileRef
end run`;

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

export const darwinAdapter: PlatformAdapter = {
  ssh: SSH,
  scp: SCP,
  sshKeygen: SSH_KEYGEN,

  supportsFileSelection: true,
  credentialStoreName: "macOS Keychain",
  captureHint: "⌃⇧⌘4",
  fileManagerName: "Finder",
  manualKeyInstallHint(user, hostName) {
    return `run ssh-copy-id -i ~/.ssh/ssh_image_drop_ed25519.pub ${user}@${hostName} in Terminal, then add the server again in Manage Servers.`;
  },
  credentialRemovalHint:
    'Remove it in Keychain Access (service "ssh-image-drop").',

  baseEnv(): NodeJS.ProcessEnv {
    return process.env; // macOS Raycast env는 보정 불필요
  },

  async extractClipboardPng(): Promise<string> {
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
  },

  /**
   * Raycast의 Clipboard.readText()는 **이미지만 있는 클립보드**에 "Image (321x97)" 같은
   * 설명 문자열을 돌려준다(실측 — 로컬 pasteboard에 텍스트 flavor가 전혀 없는 상태에서
   * 그 문자열이 원격으로 전송됐다). 그대로 두면 이미지를 보내려던 사용자에게 플레이스홀더
   * 문자열이 대신 전송된다. OS에서 직접 읽어 **실제 텍스트 flavor가 있을 때만** 텍스트로
   * 취급한다 (Windows 어댑터가 다른 실측 이슈로 이미 OS 직접 읽기를 쓰는 것과 같은 조치).
   * LC_ALL 고정: Raycast 프로세스의 locale이 C면 pbpaste가 비ASCII를 흘린다.
   */
  async readClipboardText(): Promise<string> {
    try {
      const { stdout } = await execFileP(PBPASTE, [], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024, // 텍스트 상한 20MB + 여유
        env: { ...process.env, LC_ALL: "en_US.UTF-8" },
      });
      return stdout;
    } catch (e) {
      // 크기 초과는 "텍스트 없음"이 아니다 — 접으면 "보낼 게 없다"는 정반대 안내가 나가고,
      // 이미지가 함께 있으면 텍스트 우선 규칙까지 깨고 이미지가 전송된다.
      if ((e as { code?: string }).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER")
        throw new Error(CLIPBOARD_TEXT_TOO_LARGE);
      // 그 밖의 실패만 텍스트 없음으로 접는다. Clipboard.readText()로 폴백하지 않는 이유는
      // 그것이 바로 플레이스홀더를 돌려주는 API라, 이미지 클립보드 + pbpaste 실패가 겹치면
      // 없애려던 경로가 다시 열리기 때문이다.
      return "";
    }
  },

  /**
   * getSelectedText()는 선택이 없거나 앱이 지원하지 않거나 접근성 권한이 없으면 reject한다.
   * 셋을 구분하지 않고 ""로 접는다 — 어느 쪽이든 클립보드 경로로 넘어가는 것이 정답이고,
   * "권한을 켜라"는 진단을 여기서 내면 선택을 안 한 대다수 실행에서 오탐이 된다.
   */
  async readSelectedText(): Promise<string> {
    try {
      return await getSelectedText();
    } catch {
      return "";
    }
  },

  async savePassword(alias: string, password: string): Promise<void> {
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
  },

  /** Keychain 항목 삭제. exit 44(항목 없음)는 정상 — key 모드 서버엔 항목이 없다. 그 외 실패는 rethrow. */
  async deletePassword(alias: string): Promise<void> {
    try {
      await execFileP(SECURITY, buildDeleteArgs(alias));
    } catch (e) {
      if ((e as { code?: number }).code === 44) return; // item not found — expected
      throw e;
    }
  },

  credentialEnv(alias: string): NodeJS.ProcessEnv {
    return { ...askpassBaseEnv(), SSH_IMAGE_DROP_ALIAS: alias };
  },

  /**
   * 1회용 PW를 FIFO로 askpass에 전달 — 디스크 기록 없음, 사용 후 디렉토리째 제거.
   * finally에서 O_NONBLOCK 읽기로 FIFO를 반드시 drain — ssh가 askpass를 한 번도 호출하지 않고
   * 죽으면 writer의 FIFO open이 영구 블록되어 libuv 스레드가 누수되기 때문. (blocking read로
   * 풀면 writer가 이미 소진된 케이스에서 반대 방향 데드락이 나므로 NONBLOCK이어야 한다)
   */
  async withOneTimePassword<T>(
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
  },

  async installKey(
    pubKeyPath: string,
    user: string,
    hostName: string,
    port: string,
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      // NumberOfPasswordPrompts=1: 1회용 FIFO는 재읽기가 불가 — PW 오류 시 재프롬프트가 두 번째 askpass 호출을 만들어 영구 hang이 되므로 1회로 제한
      const args = [
        "-i",
        pubKeyPath,
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
    await execFileP(OPEN, ["-R", p]);
  },
};
