import { describe, expect, it } from "vitest";
import {
  expandTilde,
  isSafeBasename,
  isSafeRemoteDir,
  isValidHost,
  isValidName,
  isValidPort,
  remoteBasename,
  shQuote,
  validateRemotePath,
} from "../src/lib/validate";
import { homedir } from "os";

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
  it("rejects relative, directory-ish, traversal basenames", () => {
    for (const p of ["tmp/x.png", "", "/tmp/", "/", "/tmp/..", "/tmp/."]) {
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
    ]) {
      expect(validateRemotePath(p)).not.toBeNull();
    }
  });
  it("rejects mid-path .. segments", () => {
    expect(validateRemotePath("/tmp/../etc/passwd")).not.toBeNull();
  });
});

describe("isSafeRemoteDir", () => {
  it("accepts absolute and ~/ dirs without metachars", () => {
    expect(isSafeRemoteDir("/tmp/clipboard-images")).toBe(true);
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
  it("rejects empty, dot segments, leading dash, and metachars", () => {
    for (const n of ["", ".", "..", "-oProxyCommand", "a;b", "a$(b)", "a\nb"])
      expect(isSafeBasename(n)).toBe(false);
  });
});

describe("expandTilde", () => {
  it("expands ~ and ~/", () => {
    expect(expandTilde("~")).toBe(homedir());
    expect(expandTilde("~/Downloads")).toBe(`${homedir()}/Downloads`);
    expect(expandTilde("/abs/path")).toBe("/abs/path");
  });
});

describe("remoteBasename", () => {
  it("extracts last segment", () => {
    expect(remoteBasename("/a/b/c.png")).toBe("c.png");
  });
});
