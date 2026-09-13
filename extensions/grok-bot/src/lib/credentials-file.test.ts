import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadGatewayCredentialsFile, parseGatewayEnv } from "./credentials-file";

describe("parseGatewayEnv", () => {
  it("reads GATEWAY_URL and GATEWAY_TOKEN", () => {
    const result = parseGatewayEnv("GATEWAY_URL=http://127.0.0.1:1340\nGATEWAY_TOKEN=abc\n");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        gatewayUrl: "http://127.0.0.1:1340",
        gatewayToken: "abc",
      });
    }
  });

  it("accepts SDK aliases and quoted values", () => {
    const result = parseGatewayEnv("GROKBOT_GATEWAY_URL='http://box:1340'\nSAND_GATEWAY_TOKEN=\"tok\"\n");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.gatewayUrl).toBe("http://box:1340");
      expect(result.value.gatewayToken).toBe("tok");
    }
  });

  it("rejects a missing token", () => {
    const result = parseGatewayEnv("GATEWAY_URL=http://127.0.0.1:1340\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "invalid-format",
        detail: "gateway.env must set a URL and a token",
      });
    }
  });
});

describe("loadGatewayCredentialsFile", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "grok-bot-creds-"));
    dirs.push(dir);
    return dir;
  }

  it("loads a mode 600 file", () => {
    const dir = tempDir();
    const path = join(dir, "gateway.env");
    writeFileSync(path, "GATEWAY_URL=http://127.0.0.1:1340\nGATEWAY_TOKEN=secret\n");
    chmodSync(path, 0o600);

    const result = loadGatewayCredentialsFile(path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.gatewayUrl).toBe("http://127.0.0.1:1340");
    }
  });

  it("rejects a world-readable file", () => {
    const dir = tempDir();
    const path = join(dir, "gateway.env");
    writeFileSync(path, "GATEWAY_URL=http://127.0.0.1:1340\nGATEWAY_TOKEN=secret\n");
    chmodSync(path, 0o644);

    const result = loadGatewayCredentialsFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "insecure-permissions" });
    }
  });

  it("rejects a symlink", () => {
    const dir = tempDir();
    const target = join(dir, "real.env");
    const path = join(dir, "gateway.env");
    writeFileSync(target, "GATEWAY_URL=http://127.0.0.1:1340\nGATEWAY_TOKEN=secret\n");
    chmodSync(target, 0o600);
    symlinkSync(target, path);

    const result = loadGatewayCredentialsFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "not-a-regular-file" });
    }
  });

  it("returns missing when the file does not exist", () => {
    const result = loadGatewayCredentialsFile(join(tempDir(), "nope.env"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "missing" });
    }
  });
});
