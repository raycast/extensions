import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ImageResult } from "./images";

export type ImageJob = {
  id: string;
  startedAt: number;
  status: "pending" | "running" | "succeeded" | "failed";
  result?: ImageResult;
  error?: string;
};
export const JOB_TIMEOUT = 10 * 60_000;
export function isActive(job: ImageJob | undefined): boolean {
  return !!job && (job.status === "pending" || job.status === "running") && Date.now() - job.startedAt < JOB_TIMEOUT;
}
function jobPath(directory: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid image job ID.");
  return join(directory, `${id}.json`);
}
export async function saveJob(directory: string, job: ImageJob) {
  await mkdir(directory, { recursive: true });
  const path = jobPath(directory, job.id);
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
  await rename(temporary, path);
}
export async function readJob(directory: string, id: string): Promise<ImageJob> {
  return JSON.parse(await readFile(jobPath(directory, id), "utf8"));
}
// An exclusive claim prevents repeated launches from sending the same paid request twice.
// Claims are retained even after failure: retries must always be a new explicit submission.
export async function claimJob(directory: string, id: string): Promise<boolean> {
  try {
    await writeFile(`${jobPath(directory, id)}.claimed`, "", { flag: "wx", mode: 0o600 });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}
