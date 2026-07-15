import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { atomicWrite, backupFile } from "@/lib/atomicWrite";

describe("atomicWrite", () => {
  it("writes file atomically", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-manager-"));
    const target = path.join(dir, "config.toml");
    await atomicWrite(target, "name = \"test\"\n");
    const content = await fs.readFile(target, "utf8");
    expect(content).toBe("name = \"test\"\n");
  });
});

describe("backupFile", () => {
  it("creates a timestamped backup", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-manager-"));
    const target = path.join(dir, "config.toml");
    await fs.writeFile(target, "model = \"test\"\n", "utf8");
    const backupPath = await backupFile(target);
    expect(backupPath).toBeTruthy();
    const backupContent = await fs.readFile(backupPath as string, "utf8");
    expect(backupContent).toBe("model = \"test\"\n");
  });
});
