import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

export const JOBS_DIR = path.join(homedir(), "Library", "Logs", "raycast-photo-ingest", "jobs");

export interface CardInfo {
  name: string;
  path: string;
  fileCount: number;
}

export interface JobState {
  jobId: string;
  pid: number;
  startedAt: string;
  destDir: string;
  folderName: string;
  cards: CardInfo[];
  stage: string;
  progress: { current: number; total: number };
  currentFile?: string;
  filePercent?: number;
  error?: string | null;
}

export function jobStateFile(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

export function newJobId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isJobRunning(state: JobState): boolean {
  return isProcessAlive(state.pid) && state.stage !== "done";
}

export async function readJobState(jobId: string): Promise<JobState | null> {
  try {
    const raw = await readFile(jobStateFile(jobId), "utf-8");
    return JSON.parse(raw) as JobState;
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<JobState[]> {
  let entries: string[];
  try {
    entries = await readdir(JOBS_DIR);
  } catch {
    return [];
  }
  const states = await Promise.all(
    entries
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const raw = await readFile(path.join(JOBS_DIR, f), "utf-8");
          return JSON.parse(raw) as JobState;
        } catch {
          return null;
        }
      }),
  );
  return states.filter((s): s is JobState => s !== null);
}

export async function listActiveJobs(): Promise<JobState[]> {
  const all = await listJobs();
  return all.filter(isJobRunning);
}
