import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
export interface Diagnostic {
  title: string;
  date: string;
  timestamp: number;
  event: string;
  summary: string;
  path: string;
}
function dateValue(text: string) {
  const normalized = text
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T")
    .replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(normalized).getTime();
}
export function parseDiagnostic(text: string, path: string): Diagnostic | null {
  if (basename(path).startsWith("JetsamEvent")) {
    const data = JSON.parse(text.slice(text.indexOf("\n") + 1));
    if (
      !Array.isArray(data.processes) ||
      !Number.isFinite(data.memoryStatus?.pageSize)
    )
      return null;
    const page = data.memoryStatus.pageSize as number;
    const sorted = [...data.processes].sort(
      (a, b) => (b.rpages || 0) - (a.rpages || 0),
    );
    const groups = new Map<
      number,
      { bytes: number; count: number; names: Set<string> }
    >();
    for (const p of sorted) {
      const key = p.coalition ?? p.pid,
        group = groups.get(key) ?? {
          bytes: 0,
          count: 0,
          names: new Set<string>(),
        };
      group.bytes += (p.rpages || 0) * page;
      group.count++;
      if (group.names.size < 4) group.names.add(String(p.name));
      groups.set(key, group);
    }
    const top = [...groups.values()]
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);
    const reasons = sorted
      .filter((p) => p.reason)
      .map((p) => `${p.name}: ${p.reason}`);
    const summary = [
      "One macOS memory snapshot. Process groups use macOS coalition membership; these are not multi-day averages.",
      ...top.map(
        (g) =>
          `${[...g.names].join(", ")}: ${(g.bytes / 1024 ** 3).toFixed(2)} GiB across ${g.count} processes`,
      ),
      `Recorded termination reason: ${reasons.join("; ") || "not specified"}. This report alone does not establish a system-wide memory shortage.`,
    ].join("\n\n");
    return {
      title: "macOS memory snapshot",
      date: String(data.date),
      timestamp: dateValue(String(data.date)),
      event: "Memory snapshot",
      summary,
      path,
    };
  }
  const fields = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line.match(
      /^(Date\/Time|Command|Event|CPU|Writes|Footprint|Duration|Action taken):\s*(.*)$/,
    );
    if (match && !fields.has(match[1])) fields.set(match[1], match[2]);
  }
  const date = fields.get("Date/Time"),
    event = fields.get("Event");
  if (!date || !event || !fields.get("Command")) return null;
  return {
    title: fields.get("Command")!,
    date,
    timestamp: dateValue(date),
    event,
    summary: [
      "A diagnostic event, not continuous monitoring or proof of a slowdown.",
      ...[...fields]
        .filter(([key]) => !["Command", "Date/Time", "Event"].includes(key))
        .map(([key, value]) => `${key}: ${value}`),
    ].join("\n\n"),
    path,
  };
}
export async function readDiagnostics() {
  const reports: Diagnostic[] = [],
    warnings: string[] = [];
  const cutoff = Date.now() - 7 * 86400000;
  for (const folder of [
    "/Library/Logs/DiagnosticReports",
    join(homedir(), "Library/Logs/DiagnosticReports"),
  ]) {
    let names: string[];
    try {
      names = await readdir(folder);
    } catch {
      warnings.push(`Could not read ${folder}`);
      continue;
    }
    for (const name of names) {
      if (!(name.endsWith(".diag") || /^JetsamEvent.*\.ips$/.test(name)))
        continue;
      const path = join(folder, name);
      try {
        const info = await stat(path);
        if (
          !info.isFile() ||
          info.size > 8 * 1024 * 1024 ||
          info.mtimeMs < cutoff
        )
          continue;
        const report = parseDiagnostic(await readFile(path, "utf8"), path);
        if (
          report &&
          Number.isFinite(report.timestamp) &&
          report.timestamp >= cutoff
        )
          reports.push(report);
      } catch {
        warnings.push(`Could not parse or read ${name}`);
      }
    }
  }
  return {
    reports: reports.sort((a, b) => b.timestamp - a.timestamp),
    warnings,
  };
}
