/// Positional values can't use "--name=value", and ArgumentParser would read
/// a leading dash as an option, so it is dropped (it carries no meaning in a
/// search topic or contact query).
export function positional(value: string): string {
  return value.trim().replace(/^-+\s*/, "");
}

export type RangePreset = "today" | "tomorrow" | "week";

export function rangeArgs(input: { range?: RangePreset; start?: string; end?: string }): string[] {
  if (input.start) {
    return input.end ? ["--start", input.start, "--end", input.end] : ["--start", input.start];
  }
  if (input.range === "tomorrow") return ["--tomorrow"];
  if (input.range === "week") return ["--week"];
  return [];
}

/// Splits a comma-, semicolon-, or newline-separated list of emails or IDs.
export function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function repeated(flag: string, values: string[] | undefined): string[] {
  return (values ?? []).filter((value) => value.trim()).flatMap((value) => [flag, value.trim()]);
}

/// Formats a Date the way the CLI's date options accept it: yyyy-MM-ddTHH:mm
/// in local time, or yyyy-MM-dd for all-day values.
export function cliDate(date: Date, dateOnly = false): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return dateOnly ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Options whose value can come from the user. Swift ArgumentParser won't take
// a value that looks like an option ("- item" in a markdown body), so these
// are always passed as "--name=value".
const VALUE_OPTIONS = new Set([
  "--account",
  "--add",
  "--assignee",
  "--attendees",
  "--bcc",
  "--calendar",
  "--body",
  "--cc",
  "--comment",
  "--date",
  "--description",
  "--end",
  "--filter",
  "--folder",
  "--in",
  "--location",
  "--placeholder",
  "--start",
  "--subject",
  "--team",
  "--template",
  "--title",
  "--to",
  "--video-conference",
]);

export function joinOptionValues(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_OPTIONS.has(args[i]) && i + 1 < args.length) {
      result.push(`${args[i]}=${args[i + 1]}`);
      i++;
    } else {
      result.push(args[i]);
    }
  }
  return result;
}
