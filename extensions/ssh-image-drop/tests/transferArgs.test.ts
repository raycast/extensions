import { describe, expect, it } from "vitest";
import {
  buildPullArgs,
  buildSendArgs,
  pickAvailableName,
  remoteFileName,
} from "../src/lib/transferArgs";
import {
  buildIsDirArgs,
  buildMkdirArgs,
  buildSendFileArgs,
} from "../src/lib/transferArgs";

describe("buildSendArgs", () => {
  it("key mode: BatchMode + keepalive + quoted remote command", () => {
    const args = buildSendArgs(
      "mm",
      "/tmp/clipboard-images",
      "clip-x.png",
      "key",
    );
    expect(args).toContain("BatchMode=yes");
    expect(args).toContain("ServerAliveInterval=5");
    expect(args[args.length - 2]).toBe("mm");
    expect(args[args.length - 1]).toBe(
      "mkdir -p '/tmp/clipboard-images' && cat > '/tmp/clipboard-images/clip-x.png'",
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
    const args = buildPullArgs("mm", "/tmp/dir", "/Users/x/Downloads/dir", "key");
    expect(args).toContain("-r");
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
});
