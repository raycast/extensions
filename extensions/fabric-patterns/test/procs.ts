// Process helpers shared by the Stop tests (test/stop.test.ts, test/background.test.ts). Not a
// test file and not a mock: plain functions over real processes.
import { expect } from "bun:test";
import { readText } from "../lib/loaders";

/** Is the pid still a process? EPERM means it exists (another user's), as lib/proc.ts reads it. */
export const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

/** The pid a fake writes to `file`, waiting up to 3 s for it. */
export async function pidFrom(file: string) {
  let pid = 0;
  for (let i = 0; i < 300 && !pid; i++) {
    await Bun.sleep(10);
    pid = Number(readText(file)?.trim()) || 0;
  }
  expect(pid ? "pid written" : `the fake never wrote ${file}`).toBe("pid written");
  return pid;
}
