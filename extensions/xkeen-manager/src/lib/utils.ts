import { getPreferenceValues } from "@raycast/api";

// === Types ===

export type Prefs = {
  sshHost: string;
  configDir?: string;
  profilesDir?: string;
  proxyTag?: string;
};

// === Config ===

export function getPaths() {
  const prefs = getPreferenceValues<Prefs>();
  const configDir = (prefs.configDir ?? "").trim() || "/opt/etc/xray/configs";
  const profilesDir = (prefs.profilesDir ?? "").trim() || "/opt/etc/xray/configs-profiles";
  return { configDir, profilesDir };
}

// Returns the user-configured proxy outbound tag preference, trimmed.
// May be an empty string when unset — callers should fall back to
// auto-detection (see QuickAddForm) rather than a hardcoded default here.
export function getProxyTagPref(): string {
  const prefs = getPreferenceValues<Prefs>();
  return (prefs.proxyTag ?? "").trim();
}

// === Parsing Helpers ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSshJson(stdout: string): any {
  try {
    const match = stdout.match(/___JSON_START___([\s\S]*?)___JSON_END___/);
    if (match && match[1]) return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
  return null;
}

// === String Utils ===

export function stripAnsi(input: string) {
  // Remove ANSI color codes and special formatting, leaving clean text
  // eslint-disable-next-line no-control-regex
  return input.replace(new RegExp("\\u001B\\[[0-?]*[ -/]*[@-~]", "g"), "");
}

export async function fetchIp(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "curl/7.64.1" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      return match ? match[0] : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function cleanOutput(stdout: string, stderr: string) {
  const out = stripAnsi(String(stdout ?? ""));
  const err = stripAnsi(String(stderr ?? ""));

  const lines = (out + "\n" + err)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const text = lines.join("\n");
  const firstLine = lines[0] || "—";
  return { text: text || "(empty)", firstLine };
}

export function shQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

export function backupLabel(label: string): string {
  const cleaned = String(label || "manual")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "manual";
}

export function basenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "config.json";
}

export function extractIpv4(text: string): string | null {
  return String(text || "").match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] ?? null;
}

export function parseKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(text || "").split("\n")) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? "Unknown error");
}

export function shortDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

export function mdCode(title: string, text: string) {
  return `# ${title}\n\n\`\`\`\n${text?.length ? text : "(empty)"}\n\`\`\``;
}
