import { describe, expect, it } from "vitest";
import { ASKPASS_SCRIPT } from "../src/lib/askpassScript";
import {
  buildAddCommand,
  buildDeleteArgs,
  KEYCHAIN_SERVICE,
  securityEscape,
} from "../src/lib/keychainCmd";

describe("securityEscape", () => {
  it("escapes backslashes and double quotes, wraps in double quotes", () => {
    expect(securityEscape('p"w')).toBe('"p\\"w"');
    expect(securityEscape("a\\b")).toBe('"a\\\\b"');
  });
  it("rejects newlines — a newline would terminate the security -i command line", () => {
    expect(() => securityEscape("a\nb")).toThrow();
    expect(() => securityEscape("a\rb")).toThrow();
  });
});

describe("buildAddCommand", () => {
  it("builds a single security -i line with -U, -T and no raw password leakage risk chars", () => {
    const cmd = buildAddCommand("mm", 'se"cret');
    expect(cmd).toBe(
      `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a "mm" -w "se\\"cret" -T /usr/bin/security\n`,
    );
  });
});

describe("buildDeleteArgs", () => {
  it("passes only non-secret identifiers via argv", () => {
    expect(buildDeleteArgs("mm")).toEqual([
      "delete-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      "mm",
    ]);
  });
});

describe("ASKPASS_SCRIPT", () => {
  it("prefers the one-shot FIFO, falls back to keychain lookup, never embeds a password", () => {
    expect(ASKPASS_SCRIPT).toContain("SSH_IMAGE_DROP_PW_PIPE");
    expect(ASKPASS_SCRIPT).toContain("find-generic-password");
    expect(ASKPASS_SCRIPT).toContain("SSH_IMAGE_DROP_ALIAS");
    expect(ASKPASS_SCRIPT.startsWith("#!/bin/sh")).toBe(true);
    expect(ASKPASS_SCRIPT).toContain('rm -f "$SSH_IMAGE_DROP_PW_PIPE"');
    expect(ASKPASS_SCRIPT).toContain("exit 1");
  });
});
