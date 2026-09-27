import { describe, expect, test } from "bun:test";
import {
  buildArgs,
  connectionKey,
  formatConnection,
  formatSshCommand,
  validateConnection,
} from "../src/lib/core";
import type { Connection } from "../src/lib/store";

const base: Connection = {
  id: "one",
  mode: "forward",
  sshTarget: "dev@example.com",
  port: 5432,
  remoteHost: "127.0.0.1",
  compression: true,
  lastUsedAt: 1,
};

describe("Quick SSH connection", () => {
  test("builds local forwarding args with compression by default", () => {
    expect(buildArgs(base)).toEqual([
      "-N",
      "-L",
      "5432:127.0.0.1:5432",
      "-C",
      "-o",
      "BatchMode=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3",
      "dev@example.com",
    ]);
  });

  test("builds a SOCKS5 dynamic forwarding tunnel", () => {
    expect(buildArgs({ ...base, mode: "socks5", port: 1080 })).toEqual([
      "-N",
      "-D",
      "1080",
      "-C",
      "-o",
      "BatchMode=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3",
      "dev@example.com",
    ]);
  });

  test("deduplicates by every connection parameter including mode", () => {
    expect(connectionKey(base)).toBe(connectionKey({ ...base, id: "two" }));
    expect(connectionKey(base)).not.toBe(
      connectionKey({ ...base, compression: false }),
    );
    expect(connectionKey(base)).not.toBe(
      connectionKey({ ...base, mode: "socks5" }),
    );
  });

  test("validates target, port, and remote host for local forwarding", () => {
    expect(validateConnection({ ...base, sshTarget: "" }).join(" ")).toContain(
      "SSH target",
    );
    expect(validateConnection({ ...base, port: 0 }).join(" ")).toContain("Port");
    expect(validateConnection({ ...base, remoteHost: "bad host" }).join(" ")).toContain(
      "Remote host",
    );
    expect(validateConnection(base)).toEqual([]);
  });

  test("does not require a remote host for SOCKS5", () => {
    expect(
      validateConnection({ ...base, mode: "socks5", remoteHost: "" }),
    ).toEqual([]);
  });

  test("formats automatic labels for both modes", () => {
    expect(formatConnection(base)).toBe(
      "dev@example.com · 5432 → 127.0.0.1",
    );
    expect(formatConnection({ ...base, mode: "socks5", port: 1080 })).toBe(
      "dev@example.com · SOCKS5 · 1080",
    );
  });
  test("formats a runnable SSH command for local forwarding", () => {
    expect(formatSshCommand(base)).toBe(
      "ssh -N -L 5432:127.0.0.1:5432 -C -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 dev@example.com",
    );
  });

  test("shell-quotes unsafe SSH targets in copied commands", () => {
    expect(formatSshCommand({ ...base, sshTarget: "dev;echo unsafe" })).toContain(
      "'dev;echo unsafe'",
    );
  });
});
