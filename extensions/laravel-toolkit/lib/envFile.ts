import { promises as fs } from "fs";
import { existsSync } from "fs";
import { join } from "path";

export async function listEnvFiles(cwd: string): Promise<string[]> {
  const entries = await fs.readdir(cwd);
  return entries.filter((e) => e.startsWith(".env"));
}

export async function readEnvFile(path: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(path, "utf8");
    const lines = content.split("\n");
    const env: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.substring(0, index);
      const value = trimmed.substring(index + 1);
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

export async function writeEnvFile(path: string, env: Record<string, string>) {
  if (existsSync(path)) {
    const backup = `${path}.bak`;
    await fs.copyFile(path, backup);
  }
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  await fs.writeFile(path, lines.join("\n"), "utf8");
}

export async function getEnvFilePath(cwd: string, filename: string): Promise<string> {
  return join(cwd, filename);
}
