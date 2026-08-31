import { describe, expect, it } from "vitest";
import {
  buildPullArgs,
  buildSendArgs,
  pickAvailableName,
  remoteFileName,
} from "../src/lib/transferArgs";
import {
  buildIsDirArgs,
  buildRemoteClipboardArgs,
  buildMkdirArgs,
  buildSendFileArgs,
} from "../src/lib/transferArgs";

describe("buildSendArgs", () => {
  it("key mode: BatchMode + keepalive + quoted remote command", () => {
    const args = buildSendArgs(
      "mm",
      "/tmp/ssh-image-drop",
      "clip-x.png",
      "key",
    );
    expect(args).toContain("BatchMode=yes");
    expect(args).toContain("ServerAliveInterval=5");
    expect(args[args.length - 2]).toBe("mm");
    expect(args[args.length - 1]).toBe(
      "mkdir -p '/tmp/ssh-image-drop' && cat > '/tmp/ssh-image-drop/clip-x.png'",
    );
  });
  it("keychain mode omits BatchMode but accepts new host keys (no key-install step to seed known_hosts)", () => {
    const args = buildSendArgs("mm", "/d", "f.png", "keychain");
    expect(args).not.toContain("BatchMode=yes");
    expect(args).toContain("StrictHostKeyChecking=accept-new");
    expect(args).toContain("PubkeyAuthentication=no");
    expect(args).toContain(
      "PreferredAuthentications=password,keyboard-interactive",
    );
    expect(args).toContain("NumberOfPasswordPrompts=1");
  });
  it("quotes hostile directory names into harmless strings", () => {
    const args = buildSendArgs("mm", "/tmp/a'; rm -rf ~;'", "f.png", "key");
    expect(args[args.length - 1]).toContain("'/tmp/a'\\''; rm -rf ~;'\\'''");
  });
  it("strips trailing slashes from remoteDir", () => {
    const args = buildSendArgs("mm", "/tmp/dir///", "f.png", "key");
    expect(args[args.length - 1]).toContain("cat > '/tmp/dir/f.png'");
  });
  it("~/ remoteDir: prefix stays outside the quote so the remote shell expands home", () => {
    const args = buildSendArgs("mm", "~/uploads", "clip-x.png", "key");
    expect(args[args.length - 1]).toBe(
      "mkdir -p ~/'uploads' && cat > ~/'uploads/clip-x.png'",
    );
  });
  it("bare ~ / ~/ remoteDir targets home itself (no literal ~ dir)", () => {
    // trailing slash 제거로 "~/"가 "~"가 되어도 홈으로 확장돼야 함
    const args = buildSendArgs("mm", "~/", "clip-x.png", "key");
    expect(args[args.length - 1]).toBe("mkdir -p ~ && cat > ~/'clip-x.png'");
  });
});

describe("buildPullArgs", () => {
  it("passes host:path and local path as argv operands (no shell)", () => {
    const args = buildPullArgs(
      "mm",
      "/tmp/a b.png",
      "/Users/x/Downloads/a b.png",
      "key",
    );
    expect(args[args.length - 2]).toBe("mm:/tmp/a b.png");
    expect(args[args.length - 1]).toBe("/Users/x/Downloads/a b.png");
    expect(args).toContain("BatchMode=yes");
  });
  it("-r 포함 — 파일·폴더 모두 pull 가능", () => {
    const args = buildPullArgs(
      "mm",
      "/tmp/dir",
      "/Users/x/Downloads/dir",
      "key",
    );
    expect(args).toContain("-r");
  });
  it("-s 포함 — legacy scp(원격 shell 평가) 다운그레이드 차단, 미지원 바이너리는 fail-closed", () => {
    expect(buildPullArgs("mm", "/tmp/a", "/x/a", "key")).toContain("-s");
    expect(buildSendFileArgs("h", "/tmp", "/x/a.png", "key")).toContain("-s");
  });
  it("glob 문자([ ] { })는 escape — 문자 클래스로 해석돼 매칭 실패하는 것 방지", () => {
    const args = buildPullArgs(
      "mm",
      "~/Desktop/2026-07-25_[회의]_정리.md",
      "/Users/x/Downloads/2026-07-25_[회의]_정리.md",
      "key",
    );
    expect(args[args.length - 2]).toBe(
      "mm:~/Desktop/2026-07-25_\\[회의\\]_정리.md",
    );
    // 로컬 경로는 argv operand 그대로 — escape 없음
    expect(args[args.length - 1]).toBe(
      "/Users/x/Downloads/2026-07-25_[회의]_정리.md",
    );
  });
  it("괄호는 glob 아님 — escape 없이 그대로", () => {
    const args = buildPullArgs("mm", "/tmp/report (1).pdf", "/x/r.pdf", "key");
    expect(args[args.length - 2]).toBe("mm:/tmp/report (1).pdf");
  });
});

describe("buildIsDirArgs", () => {
  it("절대경로는 shQuote로 감싼 test -d", () => {
    const args = buildIsDirArgs("mm", "/tmp/my dir", "key");
    expect(args[args.length - 2]).toBe("mm");
    expect(args[args.length - 1]).toBe("test -d '/tmp/my dir'");
  });
  it("~/ 경로는 prefix만 quote 밖 (원격 홈 확장 보존)", () => {
    const args = buildIsDirArgs("mm", "~/sub dir/x", "key");
    expect(args[args.length - 1]).toBe("test -d ~/'sub dir/x'");
  });
  it("bare ~ 는 홈 자체로 확장 (test -d ~)", () => {
    expect(buildIsDirArgs("mm", "~", "key").slice(-1)[0]).toBe("test -d ~");
  });
  it("keychain 모드 옵션 포함", () => {
    const args = buildIsDirArgs("h", "/tmp/d", "keychain");
    expect(args).toContain("PubkeyAuthentication=no");
  });
});

describe("remoteFileName", () => {
  it("formats clip-YYYYMMDD-HHMMSS-mmm.png", () => {
    const d = new Date(2026, 6, 16, 9, 5, 3, 7);
    expect(remoteFileName(d)).toBe("clip-20260716-090503-007.png");
  });
});

describe("pickAvailableName", () => {
  it("returns base when free, else -1/-2 suffix before extension", () => {
    expect(pickAvailableName("a.png", () => false)).toBe("a.png");
    const taken = new Set(["a.png", "a-1.png"]);
    expect(pickAvailableName("a.png", (n) => taken.has(n))).toBe("a-2.png");
    expect(pickAvailableName("noext", (n) => n === "noext")).toBe("noext-1");
  });
});

describe("buildSendFileArgs", () => {
  it("scp operand: local → host:dir/basename, key 모드 BatchMode", () => {
    const args = buildSendFileArgs(
      "mac",
      "/tmp/drop",
      "/Users/me/a.png",
      "key",
    );
    expect(args).toContain("BatchMode=yes");
    expect(args[args.length - 2]).toBe("/Users/me/a.png");
    expect(args[args.length - 1]).toBe("mac:/tmp/drop/a.png");
  });
  it("원본 basename 유지 (덮어쓰기 — suffix 없음)", () => {
    const args = buildSendFileArgs("h", "/tmp", "/x/report.pdf", "keychain");
    expect(args[args.length - 1]).toBe("h:/tmp/report.pdf");
  });
  it("remoteDir 뒤 슬래시 정규화", () => {
    const args = buildSendFileArgs("h", "/tmp/drop/", "/x/a.png", "key");
    expect(args[args.length - 1]).toBe("h:/tmp/drop/a.png");
  });
  it("공백 포함 로컬 경로는 operand로 그대로 (scp가 sftp operand로 처리)", () => {
    const args = buildSendFileArgs("h", "/tmp", "/Users/me/my file.png", "key");
    expect(args[args.length - 2]).toBe("/Users/me/my file.png");
    expect(args[args.length - 1]).toBe("h:/tmp/my file.png");
  });
  it("keychain 모드는 password 우선 옵션 포함", () => {
    const args = buildSendFileArgs("h", "/tmp", "/x/a.png", "keychain");
    expect(args).toContain("PubkeyAuthentication=no");
    expect(args).toContain("NumberOfPasswordPrompts=1");
  });
  it("-r 포함 — 폴더 재귀 업로드 지원", () => {
    const args = buildSendFileArgs("h", "/tmp", "/x/photos", "key");
    expect(args).toContain("-r");
    expect(args[args.length - 1]).toBe("h:/tmp/photos");
  });
  it("Windows 로컬 경로: 원격 파일명은 `\\` 기준 basename (전송 스킵 버그 회귀 방지)", () => {
    const args = buildSendFileArgs(
      "h",
      "/tmp/drop",
      "C:\\Users\\me\\Downloads\\새 폴더\\clip.png",
      "key",
    );
    expect(args[args.length - 2]).toBe(
      "C:\\Users\\me\\Downloads\\새 폴더\\clip.png",
    );
    expect(args[args.length - 1]).toBe("h:/tmp/drop/clip.png");
  });
  it("원격 target은 escape 금지 — scp target은 literal이라 escape하면 백슬래시가 파일명에 남는다", () => {
    const args = buildSendFileArgs(
      "h",
      "/tmp/drop",
      "/Users/me/2026-07-25_[회의]_정리.md",
      "key",
    );
    expect(args[args.length - 2]).toBe("/Users/me/2026-07-25_[회의]_정리.md");
    expect(args[args.length - 1]).toBe("h:/tmp/drop/2026-07-25_[회의]_정리.md");
  });
});

describe("buildMkdirArgs", () => {
  it("ssh mkdir -p, dir는 shQuote", () => {
    const args = buildMkdirArgs("mac", "/tmp/drop", "key");
    expect(args[args.length - 2]).toBe("mac");
    expect(args[args.length - 1]).toBe("mkdir -p '/tmp/drop'");
  });
  it("공백 포함 원격 디렉토리 quoting", () => {
    const args = buildMkdirArgs("mac", "/tmp/my drop", "key");
    expect(args[args.length - 1]).toBe("mkdir -p '/tmp/my drop'");
  });
  it("~/ 원격 디렉토리는 prefix만 quote 밖 (원격 홈 확장 보존)", () => {
    const args = buildMkdirArgs("mac", "~/drop", "key");
    expect(args[args.length - 1]).toBe("mkdir -p ~/'drop'");
  });
  it("bare ~ / ~/ 는 홈 자체 (리터럴 ~ 디렉토리 없음)", () => {
    expect(buildMkdirArgs("mac", "~/", "key").slice(-1)[0]).toBe("mkdir -p ~");
    expect(buildMkdirArgs("mac", "~", "key").slice(-1)[0]).toBe("mkdir -p ~");
  });
});

describe("buildRemoteClipboardArgs", () => {
  // 실서버(macOS 26.5 / Ubuntu)에서 그대로 실행해 검증한 명령이다. 문자열이 바뀌면
  // 원격 동작이 바뀐 것이므로 fixture로 고정한다 — quote 실수는 전체 실패로 이어진다.
  const TEXT_CMD =
    `/bin/sh -c '[ -x /usr/bin/pbcopy ] || { echo SSHIMGDROP_NOMAC >&2; exit 127; }; ` +
    `/bin/launchctl print gui/$(/usr/bin/id -u) >/dev/null 2>&1 || { echo SSHIMGDROP_NOGUI >&2; exit 126; }; ` +
    `exec /usr/bin/env LC_ALL=en_US.UTF-8 /usr/bin/pbcopy'`;

  it("text: 절대경로 + sentinel + 127→126 순서로 고정", () => {
    const args = buildRemoteClipboardArgs("mm", "text", "key");
    expect(args[args.length - 2]).toBe("mm");
    expect(args[args.length - 1]).toBe(TEXT_CMD);
  });

  it("image: PNG를 stdin으로 받아 osascript로 주입, trap으로 회수", () => {
    const cmd = buildRemoteClipboardArgs("mm", "image", "key").at(-1) as string;
    expect(cmd).toContain("[ -x /usr/bin/osascript ]");
    expect(cmd).toContain("mktemp -d -t ssh-image-drop");
    // 함수로 감싸 실행 시점에 인용된 확장 — trap 본문에 $D를 그대로 박으면
    // 원격 TMPDIR에 공백·glob이 있을 때 rm 인자가 쪼개진다
    expect(cmd).toContain('cleanup() { /bin/rm -rf "$D"; }; trap cleanup EXIT');
    expect(cmd).toContain("«class PNGf»");
  });

  it("image: 시그널에도 원격 임시 PNG를 회수한다 — EXIT trap만으로는 SIGHUP에 안 돈다", () => {
    const cmd = buildRemoteClipboardArgs("mm", "image", "key").at(-1) as string;
    // shQuote가 스크립트 전체를 감싸므로 내부 작은따옴표는 '\'' 로 이스케이프된다
    expect(cmd).toContain(`trap '\\''cleanup; exit 1'\\'' HUP INT TERM`);
  });

  it("원격 명령에 개행이 없다 — tcsh는 작은따옴표가 raw newline을 넘지 못한다", () => {
    for (const kind of ["text", "image"] as const)
      expect(buildRemoteClipboardArgs("mm", kind, "key").at(-1)).not.toContain(
        "\n",
      );
  });

  it("LC_ALL을 쓴다 — 원격 rc의 LC_ALL=C가 LANG을 무시해 한글이 소실된다(실측)", () => {
    for (const kind of ["text", "image"] as const) {
      const cmd = buildRemoteClipboardArgs("mm", kind, "key").at(-1) as string;
      expect(cmd).toContain("LC_ALL=en_US.UTF-8");
      expect(cmd).not.toMatch(/(^|[^_])LANG=/);
    }
  });

  it("검사 순서는 127(바이너리) → 126(GUI) — 뒤집으면 Linux가 126으로 오진된다", () => {
    const cmd = buildRemoteClipboardArgs("mm", "text", "key").at(-1) as string;
    expect(cmd.indexOf("exit 127")).toBeLessThan(cmd.indexOf("exit 126"));
  });

  it("auth 모드는 기존 전송과 동일한 옵션을 탄다", () => {
    expect(buildRemoteClipboardArgs("mm", "text", "key")).toContain(
      "BatchMode=yes",
    );
    expect(buildRemoteClipboardArgs("mm", "text", "keychain")).toContain(
      "PubkeyAuthentication=no",
    );
  });
});
