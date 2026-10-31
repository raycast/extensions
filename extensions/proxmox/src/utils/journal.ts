/** "Oct 25 10:07:25 pve systemd[1]: message" */
const JOURNAL_LINE_PATTERN = /^\w{3} +\d+ [\d:]{8} \S+ ([^:[]+)(?:\[\d+\])?: (.*)$/;

export type JournalEntry = { key: string; unit: string; message: string; line: string };

/** Parses the lines of `GET /nodes/{node}/journal`, newest first */
export function parseJournal(lines: string[]): JournalEntry[] {
  const seen = new Map<string, number>();
  return (
    lines
      // Proxmox wraps the journal in two cursor entries that start with "s=", so we drop them.
      .filter((line) => !line.startsWith("s="))
      .reverse()
      .map((line) => {
        // We key rows by their text so a refresh keeps the rows it already rendered.
        const count = (seen.get(line) ?? 0) + 1;
        seen.set(line, count);
        const match = JOURNAL_LINE_PATTERN.exec(line);
        return {
          key: `${line}#${count}`,
          unit: match?.[1] ?? "",
          message: match?.[2] ?? line,
          line,
        };
      })
  );
}
