import { describe, expect, it } from "vitest";
import { looksLikeWindowsServer } from "../src/lib/serverKind";

describe("looksLikeWindowsServer", () => {
  it("detects cmd.exe unknown-command / bad-switch errors", () => {
    expect(
      looksLikeWindowsServer(
        "'cat' is not recognized as an internal or external command,\noperable program or batch file.",
      ),
    ).toBe(true);
    expect(
      looksLikeWindowsServer("The syntax of the command is incorrect."),
    ).toBe(true);
  });

  it("detects PowerShell cmdlet errors", () => {
    expect(
      looksLikeWindowsServer(
        "mkdir : The term 'mkdir' is not recognized as the name of a cmdlet, function, script file, or operable program.",
      ),
    ).toBe(true);
    expect(
      looksLikeWindowsServer(
        "FullyQualifiedErrorId : CommandNotFoundException",
      ),
    ).toBe(true);
  });

  it("does NOT misfire on normal POSIX ssh errors", () => {
    for (const s of [
      "Permission denied (publickey,password).",
      "ssh: connect to host example.com port 22: Connection refused",
      "Host key verification failed.",
      "scp: /tmp/x: No such file or directory",
      "bash: cannot create /root/x: Permission denied",
      "",
    ])
      expect(looksLikeWindowsServer(s)).toBe(false);
  });

  it("does NOT misfire on Windows CLIENT-side local errors (서버 오진 방지)", () => {
    // 로컬 경로·범용 문구가 stderr에 섞여도 원격 Windows로 판정하면 안 된다
    for (const s of [
      "Bad owner or permissions on C:\\Users\\me/.ssh/config",
      "Warning: Identity file C:\\Users\\me\\.ssh\\id_ed25519 not accessible: No such file or directory.",
      "The system cannot find the path specified.",
      "could not create C:\\Users\\x\\tmp",
    ])
      expect(looksLikeWindowsServer(s)).toBe(false);
  });
});
