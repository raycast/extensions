import { describe, expect, it } from "vitest";
import {
  basenameIssue,
  CLIPBOARD_IMAGE_MAX_BYTES,
  clipboardImageSizeIssue,
  expandTilde,
  isPasteSafePath,
  isSameApp,
  findUnsafeChar,
  globEscape,
  isSafeBasename,
  isSafeRemoteDir,
  isValidHost,
  isValidName,
  isValidPort,
  localBasename,
  remoteBasename,
  sanitizeLocalName,
  shQuote,
  validateRemotePath,
} from "../src/lib/validate";
import { homedir } from "os";
import { join } from "path";

describe("isValidHost", () => {
  it("accepts ssh aliases, user@host, IPv4", () => {
    for (const v of [
      "server.example.com",
      "user@192.0.2.2",
      "myhost",
      "a_b.c-1",
    ]) {
      expect(isValidHost(v)).toBe(true);
    }
  });
  it("rejects option injection and bad leading chars", () => {
    for (const v of [
      "-v",
      "-oProxyCommand=x",
      ".hidden",
      "@host",
      "",
      "a b",
      "a\nb",
      "a;b",
      "[::1]",
    ]) {
      expect(isValidHost(v)).toBe(false);
    }
  });
});

describe("isValidName (alias/User)", () => {
  it("rejects @ which isValidHost allows", () => {
    expect(isValidName("user@host")).toBe(false);
    expect(isValidHost("user@host")).toBe(true);
  });
  it("accepts plain names", () => {
    expect(isValidName("my-server")).toBe(true);
    expect(isValidName("deploy_user.01")).toBe(true);
  });
  it("rejects whitespace, newline, leading dash/dot", () => {
    for (const v of ["a b", "a\nb", "-x", ".x", ""])
      expect(isValidName(v)).toBe(false);
  });
});

describe("isValidPort", () => {
  it("accepts 1..65535", () => {
    expect(isValidPort("22")).toBe(true);
    expect(isValidPort("65535")).toBe(true);
  });
  it("rejects 0, 65536, non-digits", () => {
    for (const v of ["0", "65536", "22a", "-1", ""])
      expect(isValidPort(v)).toBe(false);
  });
});

describe("shQuote", () => {
  it("wraps in single quotes and escapes embedded single quotes", () => {
    expect(shQuote("/tmp/a b")).toBe("'/tmp/a b'");
    expect(shQuote("a'b")).toBe("'a'\\''b'");
    expect(shQuote("$(rm -rf /)")).toBe("'$(rm -rf /)'");
  });
});

describe("validateRemotePath", () => {
  it("accepts absolute file paths (incl. spaces and unicode)", () => {
    expect(validateRemotePath("/tmp/claude/images/x.png")).toBeNull();
    expect(validateRemotePath("/tmp/사진 모음/스크린샷.png")).toBeNull();
  });
  it("accepts ~/ home-relative paths (scp SFTP expand-path)", () => {
    expect(
      validateRemotePath("~/projects/demo/backup/2026-07-16/README.md"),
    ).toBeNull();
    expect(validateRemotePath("~/docs/report.pdf")).toBeNull();
  });
  it("accepts folder paths incl. trailing slash (scp -r)", () => {
    expect(validateRemotePath("/var/log/myapp")).toBeNull();
    expect(validateRemotePath("/tmp/backup/")).toBeNull();
    expect(validateRemotePath("~/projects/demo/")).toBeNull();
  });
  it("rejects relative, root, traversal basenames", () => {
    for (const p of ["tmp/x.png", "", "/", "/tmp/..", "/tmp/."]) {
      expect(validateRemotePath(p)).not.toBeNull();
    }
  });
  it("rejects bare ~, ~/ dir, ~user, and ~/ traversal", () => {
    for (const p of ["~", "~/", "~foo/x.png", "~/../etc/passwd"]) {
      expect(validateRemotePath(p)).not.toBeNull();
    }
  });
  it("rejects shell metacharacters and control chars (injection defense)", () => {
    for (const p of [
      "/tmp/a;rm.png",
      "/tmp/$(id).png",
      "/tmp/`id`.png",
      "/tmp/a|b.png",
      "/tmp/a&b.png",
      "/tmp/a\nb.png",
      "/tmp/a*b.png",
      "/tmp/a?b.png",
      '/tmp/a"b.png',
      "/tmp/a\\b.png",
      "/tmp/a<b.png",
      "/tmp/a>b.png",
    ]) {
      expect(validateRemotePath(p)).not.toBeNull();
    }
  });
  it("accepts common filename punctuation — brackets/parens/braces/!/'", () => {
    for (const p of [
      "~/Desktop/notes/2026-07-25_[회의]_종합정리.md",
      "/tmp/report (1).pdf",
      "~/docs/note{v2}.md",
      "/tmp/final!.png",
      "/tmp/John's file.txt",
    ]) {
      expect(validateRemotePath(p)).toBeNull();
    }
  });
  it("rejection message names the offending character (알림 문구)", () => {
    expect(validateRemotePath("/tmp/a$b.png")).toContain('"$"');
  });
  it("rejects mid-path .. segments", () => {
    expect(validateRemotePath("/tmp/../etc/passwd")).not.toBeNull();
  });
});

describe("findUnsafeChar", () => {
  it("returns quoted char for visible metachars, null for clean", () => {
    expect(findUnsafeChar("a$b")).toBe('"$"');
    expect(findUnsafeChar("a*b")).toBe('"*"');
    expect(findUnsafeChar("[회의] 정리.md")).toBeNull();
  });
  it("describes control chars by codepoint (안 보이는 문자)", () => {
    expect(findUnsafeChar("a\nb")).toBe("a control character (U+000A)");
  });
});

describe("globEscape", () => {
  it("escapes glob class/brace chars so scp matches literally", () => {
    expect(globEscape("/tmp/[회의] 정리.md")).toBe("/tmp/\\[회의\\] 정리.md");
    expect(globEscape("~/note{v2}.md")).toBe("~/note\\{v2\\}.md");
  });
  it("leaves parens and plain paths untouched", () => {
    expect(globEscape("/tmp/report (1).pdf")).toBe("/tmp/report (1).pdf");
    expect(globEscape("/tmp/plain.png")).toBe("/tmp/plain.png");
  });
});

describe("isSafeRemoteDir", () => {
  it("accepts absolute and ~/ dirs without metachars", () => {
    expect(isSafeRemoteDir("/tmp/ssh-image-drop")).toBe(true);
    expect(isSafeRemoteDir("~/uploads")).toBe(true);
  });
  it("rejects relative, ~foo, metachar, and .. dirs", () => {
    for (const d of [
      "tmp/x",
      "~foo/bar",
      "/tmp/$(id)",
      "/tmp/../etc",
      "/tmp/a;b",
    ])
      expect(isSafeRemoteDir(d)).toBe(false);
  });
});

describe("isSafeBasename", () => {
  it("accepts normal names incl. spaces and unicode", () => {
    expect(isSafeBasename("report.pdf")).toBe(true);
    expect(isSafeBasename("스크린샷 2026.png")).toBe(true);
  });
  it("accepts common filename punctuation", () => {
    for (const n of [
      "2026-07-25_[회의]_종합정리.md",
      "report (1).pdf",
      "note{v2}.md",
      "final!.png",
      "John's file.txt",
    ])
      expect(isSafeBasename(n)).toBe(true);
  });
  it("rejects empty, dot segments, leading dash, and metachars", () => {
    for (const n of [
      "",
      ".",
      "..",
      "-oProxyCommand",
      "a;b",
      "a$(b)",
      "a\nb",
      "a*b",
      'a"b',
      "a\\b",
    ])
      expect(isSafeBasename(n)).toBe(false);
  });
});

describe("basenameIssue (skip 사유 문구)", () => {
  it("names the offending character", () => {
    expect(basenameIssue("a$b.png")).toBe('name contains "$"');
    expect(basenameIssue("-oProxyCommand")).toBe('name starts with "-"');
    expect(basenameIssue("..")).toBe("invalid name");
  });
  it("returns null for safe names — isSafeBasename과 단일 소스", () => {
    expect(basenameIssue("[회의] 정리.md")).toBeNull();
  });
});

describe("expandTilde", () => {
  it("expands ~ and ~/", () => {
    expect(expandTilde("~")).toBe(homedir());
    expect(expandTilde("~/Downloads")).toBe(join(homedir(), "Downloads"));
    expect(expandTilde("/abs/path")).toBe("/abs/path");
  });
});

describe("localBasename", () => {
  it("handles POSIX separators like remoteBasename", () => {
    expect(localBasename("/a/b/c.png")).toBe("c.png");
    expect(localBasename("/a/b/")).toBe("b");
    expect(localBasename("file.txt")).toBe("file.txt");
  });

  it("handles Windows backslash paths (the send-file bug)", () => {
    expect(localBasename("C:\\Users\\me\\Downloads\\clip.png")).toBe(
      "clip.png",
    );
    // 한글·공백 폴더 안의 파일 — basename은 ASCII 파일명만
    expect(localBasename("C:\\Users\\me\\Downloads\\새 폴더\\clip.png")).toBe(
      "clip.png",
    );
    // 폴더 자체(트레일링 구분자) — 폴더명 반환
    expect(localBasename("C:\\Users\\x\\새 폴더\\")).toBe("새 폴더");
    // 혼합 구분자
    expect(localBasename("C:/Users/x\\sub/file.png")).toBe("file.png");
  });

  it("resulting basename passes isSafeBasename (the skip bug)", () => {
    // 회귀 방지: Windows 경로 전체를 넣으면 isSafeBasename이 거부했었다
    expect(isSafeBasename(localBasename("C:\\Users\\x\\clip.png"))).toBe(true);
  });
});

describe("remoteBasename", () => {
  it("extracts last segment", () => {
    expect(remoteBasename("/a/b/c.png")).toBe("c.png");
  });
});

describe("sanitizeLocalName (Windows pull 로컬 파일명)", () => {
  it("POSIX에서는 원본 그대로", () => {
    expect(sanitizeLocalName("NUL", false)).toBe("NUL");
    expect(sanitizeLocalName("a:b.txt", false)).toBe("a:b.txt");
  });
  it("예약 장치명은 file- 접두 (확장자·대소문자 무관)", () => {
    expect(sanitizeLocalName("NUL", true)).toBe("file-NUL");
    expect(sanitizeLocalName("con.txt", true)).toBe("file-con.txt");
    expect(sanitizeLocalName("COM1.log", true)).toBe("file-COM1.log");
  });
  it("콜론은 ADS 방지 위해 치환, 후행 점·공백 제거", () => {
    expect(sanitizeLocalName("report:secret.md", true)).toBe(
      "report_secret.md",
    );
    expect(sanitizeLocalName("name.", true)).toBe("name");
    expect(sanitizeLocalName("name  ", true)).toBe("name");
  });
  it("정규화로 비면 file 폴백, 일반 이름은 불변", () => {
    expect(sanitizeLocalName("...", true)).toBe("file");
    expect(sanitizeLocalName("스크린샷 (1).png", true)).toBe(
      "스크린샷 (1).png",
    );
  });
});

describe("clipboardImageSizeIssue", () => {
  it("상한 이하는 통과 (경계 포함)", () => {
    expect(clipboardImageSizeIssue(0)).toBeNull();
    expect(clipboardImageSizeIssue(CLIPBOARD_IMAGE_MAX_BYTES)).toBeNull();
  });
  it("상한 초과는 실제 크기와 상한을 문구에 담아 거부", () => {
    const issue = clipboardImageSizeIssue(CLIPBOARD_IMAGE_MAX_BYTES + 1);
    expect(issue).toContain("20.0 MB");
    expect(issue).toContain("the limit is 20 MB");
  });
});

describe("isPasteSafePath", () => {
  it("생성된 원격 경로는 허용", () => {
    expect(isPasteSafePath("/tmp/ssh-image-drop/20260809-101112.png")).toBe(
      true,
    );
    expect(isPasteSafePath("~/shots/스크린샷 (1).png")).toBe(true);
  });
  it("빈 문자열 거부", () => {
    expect(isPasteSafePath("")).toBe(false);
  });
  it("입력 확정으로 해석되는 제어문자 거부 — LF·CR·NUL", () => {
    expect(isPasteSafePath("/tmp/a.png\n/tmp/b.png")).toBe(false);
    expect(isPasteSafePath("/tmp/a.png\r")).toBe(false);
    expect(isPasteSafePath("/tmp/a\0.png")).toBe(false);
  });
});

describe("isSameApp", () => {
  it("bundleId가 같으면 동일", () => {
    expect(
      isSameApp(
        { name: "Warp", bundleId: "dev.warp.Warp-Stable" },
        { name: "Warp", bundleId: "dev.warp.Warp-Stable" },
      ),
    ).toBe(true);
  });
  it("양쪽에 bundleId가 있고 다르면 name이 같아도 거부 — 변형 번들 오인 방지", () => {
    expect(
      isSameApp(
        { name: "Code", bundleId: "com.microsoft.VSCode" },
        { name: "Code", bundleId: "com.microsoft.VSCodeInsiders" },
      ),
    ).toBe(false);
  });
  it("bundleId가 한쪽에만 있으면 다음 단계(path)로 내려간다", () => {
    expect(
      isSameApp(
        { name: "Warp", path: "/Applications/Warp.app" },
        {
          name: "Warp",
          path: "/Applications/Warp.app",
          bundleId: "dev.warp.Warp-Stable",
        },
      ),
    ).toBe(true);
  });
  it("windowsAppId가 bundleId보다 우선", () => {
    expect(
      isSameApp(
        { windowsAppId: "A", bundleId: "same" },
        { windowsAppId: "B", bundleId: "same" },
      ),
    ).toBe(false);
  });
  it("식별자가 name뿐이면 name으로 비교", () => {
    expect(isSameApp({ name: "Terminal" }, { name: "Terminal" })).toBe(true);
    expect(isSameApp({ name: "Terminal" }, { name: "Warp" })).toBe(false);
  });
  it("한쪽이 없거나 식별자가 전무하면 fail-closed", () => {
    expect(isSameApp(undefined, { name: "Warp" })).toBe(false);
    expect(isSameApp({ name: "Warp" }, undefined)).toBe(false);
    expect(isSameApp({}, {})).toBe(false);
  });
});
