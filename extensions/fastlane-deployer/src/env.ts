import fs from "fs";
import path from "path";

function parseLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice(7).trim()
    : trimmed;
  const index = normalized.indexOf("=");
  if (index === -1) return undefined;

  const key = normalized.slice(0, index).trim();
  const raw = normalized.slice(index + 1).trim();
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"));
  const value = quoted ? raw.slice(1, -1) : raw;
  return { key, value: value.replace(/\\n/g, "\n") };
}

export function expandPath(filePath: string) {
  return filePath.replace(/^~(?=$|\/)/, process.env.HOME || "");
}

export function loadEnvFile(filePath?: string) {
  if (!filePath) return {};
  const expanded = expandPath(filePath);
  if (!fs.existsSync(expanded))
    throw new Error(`Env file not found: ${expanded}`);

  const env: Record<string, string> = {};
  const contents = fs.readFileSync(expanded, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) env[parsed.key] = parsed.value;
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.endsWith("_PATH")) continue;
    const target = key.slice(0, -5);
    if (env[target]) continue;
    const resolved = path.resolve(path.dirname(expanded), expandPath(value));
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile())
      env[target] = fs.readFileSync(resolved, "utf8");
  }

  return env;
}
