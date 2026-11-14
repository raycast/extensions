import { describe, expect, it } from "vitest";
import {
  ASKPASS_BAT,
  ASKPASS_PS1,
  CLIPBOARD_PNG_PS,
  DPAPI_SAVE_PS,
  credBlobFileName,
  toBase64Utf8,
} from "../src/lib/winScripts";

describe("credBlobFileName", () => {
  it("keeps safe alias chars and adds cred- prefix + .dpapi suffix", () => {
    expect(credBlobFileName("prod-web_1.example")).toBe(
      "cred-prod-web_1.example.dpapi",
    );
  });

  it("prefix neutralizes Windows reserved device names", () => {
    // "con.dpapi"는 레거시 경로에서 CON 장치로 해석될 수 있다 — 접두로 회피
    expect(credBlobFileName("con")).toBe("cred-con.dpapi");
    expect(credBlobFileName("NUL")).toBe("cred-NUL.dpapi");
  });

  it("percent-encodes filesystem-unsafe chars deterministically", () => {
    expect(credBlobFileName("user@host")).toBe("cred-user%40host.dpapi");
    expect(credBlobFileName("a/b\\c:d")).toBe("cred-a%2Fb%5Cc%3Ad.dpapi");
  });

  it("distinct aliases never collide", () => {
    const names = ["a@b", "a%40b", "a b", "a+b"].map(credBlobFileName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("toBase64Utf8", () => {
  it("round-trips ASCII and non-ASCII passwords", () => {
    for (const pw of ["secret123", "p@ss word!", "비밀번호☂", "päßwörd"]) {
      expect(Buffer.from(toBase64Utf8(pw), "base64").toString("utf8")).toBe(pw);
    }
  });

  it("emits pure ASCII (codepage-safe over stdin)", () => {
    // eslint-disable-next-line no-control-regex -- ASCII 범위 검증 의도
    expect(/^[\x20-\x7e]*$/.test(toBase64Utf8("비밀번호☂"))).toBe(true);
  });
});

describe("script texts", () => {
  it("askpass ps1 reads the env var contract and writes raw UTF-8", () => {
    expect(ASKPASS_PS1).toContain("$env:SSH_IMAGE_DROP_CRED");
    expect(ASKPASS_PS1).toContain("OpenStandardOutput");
    // blob 부재 시 실패 종료 — ssh가 빈 PW로 오인하지 않게
    expect(ASKPASS_PS1).toContain("exit 1");
  });

  it("askpass bat delegates to askpass.ps1 with absolute powershell path", () => {
    expect(ASKPASS_BAT).toContain(
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    );
    expect(ASKPASS_BAT).toContain("askpass.ps1");
    expect(ASKPASS_BAT).toContain("-NoProfile");
  });

  it("dpapi save reads base64 from stdin only (no password in argv)", () => {
    expect(DPAPI_SAVE_PS).toContain("[Console]::In.ReadToEnd()");
    expect(DPAPI_SAVE_PS).toContain("FromBase64String");
    expect(DPAPI_SAVE_PS).toContain("ConvertFrom-SecureString");
  });

  it("dpapi save is atomic — writes .tmp then renames (기존 blob 손상 방지)", () => {
    expect(DPAPI_SAVE_PS).toContain('$args[0] + ".tmp"');
    expect(DPAPI_SAVE_PS).toContain("Move-Item");
  });

  it("clipboard script exits 1 when no image (NO_IMAGE contract)", () => {
    expect(CLIPBOARD_PNG_PS).toContain("GetImage()");
    expect(CLIPBOARD_PNG_PS).toContain("exit 1");
  });
});
