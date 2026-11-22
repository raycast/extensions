import { access, open, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const NOISE_PATTERNS = [
  /\[plugins\]/,
  /plugins\.allow is empty/,
  /non-bundled plugins/,
  /Registered feishu/,
  /pnpm\/global/,
];

function normalizeLogLine(line: string): string {
  if (!line.trimStart().startsWith("{")) return line;
  try {
    const value = JSON.parse(line);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return line;
    const meta = value._meta;
    const time = value.time ?? meta?.date;
    const level = meta?.logLevelName ?? value.level;
    const message = value.message ?? value.msg ?? value["1"] ?? value["0"];
    if (
      typeof time !== "string" ||
      typeof level !== "string" ||
      typeof message !== "string"
    )
      return line;
    return `${time} ${level} ${message}`;
  } catch {
    return line;
  }
}

export function formatLogs(content: string, lineCount = 80): string {
  return content
    .split("\n")
    .map(normalizeLogLine)
    .filter(
      (line) =>
        line.trim() && !NOISE_PATTERNS.some((pattern) => pattern.test(line)),
    )
    .slice(-lineCount)
    .map((line) => {
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))\s+(\w+)\s+(.+)$/,
      );
      if (!match) return line;
      const time = match[1]
        .slice(11)
        .replace(/(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, "");
      const icon = ["error", "fatal"].includes(match[2].toLowerCase())
        ? "🔴"
        : match[2].toLowerCase() === "warn"
          ? "🟡"
          : match[2].toLowerCase() === "info"
            ? "🔵"
            : "⚪";
      return `\`${time}\` ${icon} ${match[3].replace(/\{"subsystem":"[^"]+"\}\s*/g, "").trim()}`;
    })
    .join("\n\n");
}

export async function readLogContent(
  path: string,
  maxBytes = 256 * 1024,
): Promise<string> {
  const file = await open(path, "r");
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("The log path must point to a file.");
    const start = Math.max(0, stat.size - maxBytes);
    const buffer = Buffer.alloc(Math.min(stat.size, maxBytes));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, start);
    let content = buffer.subarray(0, bytesRead).toString("utf8");
    if (start > 0) {
      const newline = content.indexOf("\n");
      content = newline < 0 ? "" : content.slice(newline + 1);
    }
    return content;
  } finally {
    await file.close();
  }
}

export async function readLogTail(
  path: string,
  maxBytes = 256 * 1024,
): Promise<string> {
  return (
    formatLogs(await readLogContent(path, maxBytes)) ||
    "No log entries in the file tail."
  );
}

export type LogLevel = "error" | "warn" | "info" | "debug" | "unknown";
export interface LogEntry {
  id: string;
  timestamp: string;
  firstTimestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  raw: string[];
  count: number;
}

export function parseLogEntries(
  content: string,
  limit = 80,
  groupRepeated = true,
): LogEntry[] {
  const records: LogEntry[] = [];
  for (const raw of content.split("\n").filter((line) => line.trim())) {
    const line = normalizeLogLine(raw);
    const timestamp = line.match(
      /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))\s+/,
    );
    if (!timestamp && records.length && !raw.trimStart().startsWith("{")) {
      const previous = records[records.length - 1];
      previous.message += "\n" + raw;
      previous.raw[0] += "\n" + raw;
      continue;
    }
    let message = timestamp ? line.slice(timestamp[0].length) : line;
    const levelMatch = message.match(
      /^(?:\[(trace|debug|info|warn|warning|error|fatal)\]:?|(trace|debug|info|warn|warning|error|fatal))\s*/i,
    );
    const value = (levelMatch?.[1] ?? levelMatch?.[2] ?? "").toLowerCase();
    let level: LogLevel = ["error", "fatal"].includes(value)
      ? "error"
      : ["warn", "warning"].includes(value)
        ? "warn"
        : ["debug", "trace"].includes(value)
          ? "debug"
          : timestamp
            ? "info"
            : "unknown";
    if (levelMatch) message = message.slice(levelMatch[0].length);
    const subsystem = message.match(/^\[([\w./:-]+)\]\s*/);
    let source = subsystem?.[1] ?? "gateway";
    if (subsystem) message = message.slice(subsystem[0].length);
    const clientEvent = message.match(
      /^\[\s*\[\s*['"]([^'"]+)['"]\s*\],\s*['"]([\s\S]+)['"]\s*\]$/,
    );
    if (clientEvent) {
      source = clientEvent[1];
      message = clientEvent[2];
    }

    // Structured diagnostic records often keep the subsystem outside message text.
    if (raw.trimStart().startsWith("{")) {
      try {
        const json = JSON.parse(raw);
        let category = json["0"];
        if (typeof category === "string" && category.startsWith("{"))
          category = JSON.parse(category)?.subsystem;
        if (typeof category === "string" && json["1"] !== undefined)
          source = category;
        else if (typeof json._meta?.name === "string") source = json._meta.name;
      } catch {
        /* Keep malformed records visible. */
      }
    }
    if (
      /Skipping escaped skill path outside its configured root/.test(message) &&
      !levelMatch
    )
      level = "warn";
    records.push({
      id: String(records.length),
      timestamp: timestamp?.[1] ?? "",
      firstTimestamp: timestamp?.[1] ?? "",
      level,
      source,
      message,
      raw: [raw],
      count: 1,
    });
  }
  const entries: LogEntry[] = [];
  if (!groupRepeated) return records.slice(-limit).reverse();
  const groups = new Map<string, LogEntry>();
  for (const entry of records.slice(-limit).reverse()) {
    const summary = entry.message.startsWith(
      "Skipping escaped skill path outside its configured root:",
    )
      ? "Skipped skill paths outside the configured root"
      : entry.message;
    const key = JSON.stringify([entry.level, entry.source, summary]);
    const group = groups.get(key);
    if (group) {
      group.count++;
      group.firstTimestamp = entry.timestamp || group.firstTimestamp;
      group.raw.push(...entry.raw);
    } else {
      const grouped = { ...entry, message: summary };
      groups.set(key, grouped);
      entries.push(grouped);
    }
  }
  return entries;
}

export function logEntryMarkdown(entry: LogEntry): string {
  const raw = entry.raw.join("\n\n");
  const longest = Math.max(
    0,
    ...(raw.match(/`+/g) ?? []).map((run) => run.length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}text\n${raw}\n${fence}`;
}

type LogLocations = {
  home?: string;
  stateDirectory?: string;
  dailyDirectories?: string[];
  includeServiceLog?: boolean;
};

export function logErrorMessage(error: unknown): string {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "EACCES" || code === "EPERM")
    return "Permission denied reading the log. Check the file permissions or choose another log path.";
  if (code === "ENOENT")
    return "The log file no longer exists. Refresh or check Log File Path in extension preferences.";
  return error instanceof Error && !code
    ? error.message
    : "Could not read the log file. Check Log File Path in extension preferences.";
}

export async function resolveLogPath(
  configured = "",
  locations: LogLocations = {},
): Promise<string> {
  const home = locations.home ?? homedir();
  const state =
    locations.stateDirectory ??
    process.env.OPENCLAW_STATE_DIR ??
    join(home, ".openclaw");
  const custom = configured.trim().replace(/^~(?=\/)/, home);
  const readable = async (path: string) => {
    if (!(await stat(path)).isFile())
      throw new Error("The log path must point to a file.");
    await access(path, constants.R_OK);
    return path;
  };
  if (custom) {
    try {
      return await readable(custom);
    } catch (error) {
      throw new Error(logErrorMessage(error));
    }
  }
  const candidates = [
    ...(locations.includeServiceLog === false
      ? []
      : [join(home, "Library/Logs/openclaw/gateway.log")]),
    join(state, "logs/gateway.log"),
  ];
  const dailyDirectories = locations.dailyDirectories ?? [
    ...new Set(["/tmp/openclaw", join(tmpdir(), "openclaw")]),
  ];
  let permissionDenied = false;
  for (const directory of dailyDirectories) {
    try {
      const names = (await readdir(directory))
        .filter((name) => /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(name))
        .sort()
        .reverse();
      candidates.push(...names.map((name) => join(directory, name)));
    } catch (error) {
      if (
        ["EACCES", "EPERM"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        permissionDenied = true;
    }
  }
  for (const path of candidates) {
    try {
      return await readable(path);
    } catch (error) {
      if (
        ["EACCES", "EPERM"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        permissionDenied = true;
    }
  }
  throw new Error(
    permissionDenied
      ? "Log files could not be accessed. Check file permissions or set Log File Path in extension preferences."
      : "No OpenClaw log file was found. Start the Gateway or set Log File Path in extension preferences.",
  );
}
