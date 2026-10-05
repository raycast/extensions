export type SeverityLevel = "ERROR" | "WARNING" | "INFO" | "VERBOSE" | "RAW" | string;

export type StructuredLine = {
  type: "structured";
  pid: string;
  tid: string;
  date: string;
  time: string;
  level: SeverityLevel;
  sourceFile: string;
  sourceLine: string;
  message: string;
};

export type RawLine = {
  type: "raw";
  text: string;
  severity: "RAW";
};

export type LogRow = StructuredLine | RawLine;

const CHROMIUM_LINE_REGEX = /^\[(\d+):(\d+):(\d{4})\/(\d{6})\.(\d+):([A-Z]+):([^:]+):(\d+)\] (.*)$/;

export function parseChromiumLog(line: string): LogRow {
  const match = line.match(CHROMIUM_LINE_REGEX);
  if (!match) {
    return { type: "raw", text: line, severity: "RAW" };
  }
  const [, pid, tid, date, timeBase, timeMicro, level, sourceFile, sourceLine, message] = match;
  return {
    type: "structured",
    pid,
    tid,
    date,
    time: `${timeBase}.${timeMicro}`,
    level,
    sourceFile,
    sourceLine,
    message,
  };
}

export function reconstructStructuredLine(line: StructuredLine): string {
  return `[${line.pid}:${line.tid}:${line.date}/${line.time}:${line.level}:${line.sourceFile}:${line.sourceLine}] ${line.message}`;
}

export function rowSourceText(row: LogRow): string {
  return row.type === "structured" ? reconstructStructuredLine(row) : row.text;
}

export function rowComparableText(row: LogRow): string {
  return row.type === "structured" ? row.message : row.text;
}
