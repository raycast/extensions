import { PackageDetail } from "./types";

/**
 * Parse a winget tabular output (e.g. `winget search`, `winget list`, `winget upgrade`).
 *
 * Winget tables look like:
 *
 *   Name          Id              Version   Available  Source
 *   ---------------------------------------------------------
 *   Git           Git.Git         2.44.0    2.45.0     winget
 *
 * The separator line of dashes signals the start of data rows. Column positions
 * are read from the header line (the line immediately before the separator).
 */
export function parseTable(output: string): Record<string, string>[] {
  // winget writes spinner animation frames to stdout using bare \r (carriage return)
  // to overwrite the same line. Replacing all \r (not just \r\n) with \n turns
  // each spinner frame into a separate line that is then trivially filtered out.
  const lines = output
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd());

  // Locate the separator: a solid run of ≥10 dashes with no spaces.
  // The spinner fragment "   - " (5 chars) will never match this.
  const sepIdx = lines.findIndex((line) => /^-{10,}$/.test(line));

  if (sepIdx < 1) return [];

  const headerLine = lines[sepIdx - 1];

  // Derive column start positions from where each word begins in the header
  const columns: Array<{ name: string; start: number }> = [];
  const headerRegex = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(headerLine)) !== null) {
    columns.push({ name: m[0], start: m.index });
  }

  if (columns.length === 0) return [];

  const results: Record<string, string>[] = [];

  for (const line of lines.slice(sepIdx + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Footer lines like "3 packages found." or "2 upgrades available." signal end of data
    if (/^\d+\s+(package|upgrade|app)/i.test(trimmed)) break;

    const row: Record<string, string> = {};
    for (let i = 0; i < columns.length; i++) {
      const start = columns[i].start;
      const end = i < columns.length - 1 ? columns[i + 1].start : undefined;
      const value = end !== undefined ? line.slice(start, end).trim() : line.slice(start).trim();
      row[columns[i].name] = value;
    }

    results.push(row);
  }

  return results;
}

/**
 * Parse `winget show --id <id>` key-value output into a flat object.
 *
 * The first line is typically:  "Found Git [Git.Git]"
 * Subsequent lines are:         "Key: value"
 * Multi-line values (Tags, Description with continuation) are indented.
 */
export function parseKeyValue(output: string): Record<string, string> {
  const lines = output.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const result: Record<string, string> = {};

  // First non-empty line: "Found <Name> [<Id>]"
  const firstLine = lines.find((l) => l.trim().length > 0) ?? "";
  const foundMatch = firstLine.match(/^Found (.+?) \[(.+?)\]/);
  if (foundMatch) {
    result["_name"] = foundMatch[1].trim();
    result["_id"] = foundMatch[2].trim();
  }

  let currentKey: string | null = null;
  const currentValueLines: string[] = [];

  const flushCurrent = () => {
    if (currentKey !== null) {
      result[currentKey] = currentValueLines.join("\n").trim();
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;

    if (/^\s/.test(line)) {
      // Indented continuation line
      if (currentKey !== null) {
        currentValueLines.push(line.trim());
      }
    } else {
      // New top-level entry
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        flushCurrent();
        currentKey = line.slice(0, colonIdx).trim();
        currentValueLines.length = 0;
        const inlineValue = line.slice(colonIdx + 1).trim();
        if (inlineValue) currentValueLines.push(inlineValue);
      }
    }
  }

  flushCurrent();
  return result;
}

/** Map a `parseKeyValue` result to a typed `PackageDetail`. */
export function parsePackageDetail(output: string): PackageDetail | null {
  const kv = parseKeyValue(output);

  // Need at least a version to be considered valid
  if (!kv["Version"] && !kv["_id"]) return null;

  return {
    name: kv["_name"] ?? kv["Name"] ?? "",
    id: kv["_id"] ?? "",
    version: kv["Version"] ?? "",
    publisher: kv["Publisher"] || undefined,
    publisherUrl: kv["Publisher Url"] || undefined,
    description: kv["Description"] || undefined,
    homepage: kv["Homepage"] || undefined,
    license: kv["License"] || undefined,
    licenseUrl: kv["License Url"] || undefined,
    tags: kv["Tags"] ? kv["Tags"].split("\n").filter(Boolean) : undefined,
    moniker: kv["Moniker"] || undefined,
    installerType: kv["Installer Type"] || undefined,
  };
}
