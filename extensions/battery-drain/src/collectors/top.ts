import { ProcessEnergy } from "../types";

const HEADER = /^PID\s+POWER\s+%CPU\s+COMMAND/;
const ROW = /^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+?)\s*$/;

// top -l 2 prints two blocks; the first reports since-boot usage, so only the last one is used.
export function parseTop(text: string): ProcessEnergy[] {
  const lines = text.split("\n");
  let header = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (HEADER.test(lines[i].trim())) {
      header = i;
      break;
    }
  }
  if (header < 0) return [];

  const rows: ProcessEnergy[] = [];
  for (const line of lines.slice(header + 1)) {
    const m = ROW.exec(line);
    if (!m) break;
    rows.push({ pid: Number(m[1]), energy: Number(m[2]), cpu: Number(m[3]), command: m[4] });
  }
  return rows;
}
