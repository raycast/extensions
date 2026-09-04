import { stripMarkdownLinks } from "./parser";

export interface LogHeaders {
  pomodoroLogHeader: string; // e.g. "### Pomodoro Log"
  logSectionHeader: string; // e.g. "## Work Log"
}

const HEADING_RE = /^#{1,6} /;
const INDENTED_RE = /^(?:\t| {2,})\S/;

/**
 * Append one log entry to the markdown note, under the task's bullet in the
 * pomodoro log section. Nothing else in the note is touched: the section is
 * never regenerated, so anything written by hand stays where it is.
 *
 * `entryLine` is the full indented line, e.g. "\t- [x] 09:02-09:27 Subtask".
 */
export function appendLogEntry(
  content: string,
  taskTitle: string,
  entryLine: string,
  headers: LogHeaders,
): string {
  const lines = content.split("\n");
  const headerIdx = lines.findIndex((l) =>
    l.startsWith(headers.pomodoroLogHeader),
  );

  if (headerIdx === -1) {
    return insertNewSection(lines, taskTitle, entryLine, headers);
  }

  // Section body: [start, end) up to the next heading of any level.
  const start = headerIdx + 1;
  let end = start;
  while (end < lines.length && !HEADING_RE.test(lines[end])) end++;

  // Existing bullet for this task: append after its last indented child.
  for (let i = start; i < end; i++) {
    const m = lines[i].match(/^- (.+)$/);
    if (!m || stripMarkdownLinks(m[1].trim()) !== taskTitle) continue;
    let insertAt = i + 1;
    while (insertAt < end && INDENTED_RE.test(lines[insertAt])) {
      // Already written (e.g. by a concurrent writer): leave the note as is.
      if (lines[insertAt] === entryLine) return content;
      insertAt++;
    }
    lines.splice(insertAt, 0, entryLine);
    return lines.join("\n");
  }

  // New task bullet at the end of the section, before its trailing blanks.
  let insertAt = end;
  while (insertAt > start && lines[insertAt - 1].trim() === "") insertAt--;
  const bodyIsEmpty = insertAt === start;
  lines.splice(
    insertAt,
    0,
    ...(bodyIsEmpty ? [""] : []),
    `- ${taskTitle}`,
    entryLine,
  );
  return lines.join("\n");
}

function insertNewSection(
  lines: string[],
  taskTitle: string,
  entryLine: string,
  headers: LogHeaders,
): string {
  const section = [headers.pomodoroLogHeader, "", `- ${taskTitle}`, entryLine];

  // Inside the work-log section, after any callout / blank lines that
  // directly follow its heading.
  const sectionIdx = lines.findIndex((l) =>
    l.startsWith(headers.logSectionHeader),
  );
  if (sectionIdx !== -1) {
    let insertAt = sectionIdx + 1;
    while (
      insertAt < lines.length &&
      (lines[insertAt].startsWith(">") || lines[insertAt].trim() === "")
    ) {
      insertAt++;
    }
    lines.splice(insertAt, 0, ...section, "");
    return lines.join("\n");
  }

  // Fallback: append to the end of the note.
  const content = lines.join("\n");
  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  return content + separator + section.join("\n") + "\n";
}
