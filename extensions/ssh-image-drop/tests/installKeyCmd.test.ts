import { describe, expect, it } from "vitest";
import {
  buildInstallKeyArgs,
  buildInstallKeyCommand,
} from "../src/lib/installKeyCmd";

const KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample ssh-image-drop";

describe("buildInstallKeyCommand", () => {
  it("quotes the key and appends idempotently via grep -qxF", () => {
    const cmd = buildInstallKeyCommand(KEY);
    expect(cmd).toContain(`grep -qxF '${KEY}'`);
    expect(cmd).toContain(`printf '%s\\n' '${KEY}' >> ~/.ssh/authorized_keys`);
    // 디렉토리·파일 권한을 키 추가 전에 고정
    expect(cmd).toMatch(/mkdir -p ~\/\.ssh && chmod 700 ~\/\.ssh/);
    expect(cmd).toContain("chmod 600 ~/.ssh/authorized_keys");
    // || 우선순위 그룹핑 — 그룹 없으면 grep 성공 시 chmod 체인이 건너뛰어질 수 있다
    expect(cmd).toContain("{ grep");
    expect(cmd).toContain("; }");
  });

  it("escapes single quotes inside the key comment", () => {
    const cmd = buildInstallKeyCommand("ssh-ed25519 AAAA it's-a-comment");
    expect(cmd).toContain("'ssh-ed25519 AAAA it'\\''s-a-comment'");
  });

  it("rejects empty and multi-line keys", () => {
    expect(() => buildInstallKeyCommand("")).toThrow();
    expect(() => buildInstallKeyCommand("   ")).toThrow();
    expect(() => buildInstallKeyCommand("a\nb")).toThrow();
    expect(() => buildInstallKeyCommand("a\rb")).toThrow();
  });

  it("trims surrounding whitespace from the key file content", () => {
    expect(buildInstallKeyCommand(`${KEY}\n`)).toBe(
      buildInstallKeyCommand(KEY),
    );
  });
});

describe("buildInstallKeyArgs", () => {
  it("matches the mac ssh-copy-id option set with single password prompt", () => {
    const args = buildInstallKeyArgs("deploy", "203.0.113.7", "2222", "CMD");
    expect(args).toEqual([
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
      "2222",
      "deploy@203.0.113.7",
      "CMD",
    ]);
  });
});
