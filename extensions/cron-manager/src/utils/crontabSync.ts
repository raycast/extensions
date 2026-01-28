import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { CronJob } from "../types";

const execAsync = promisify(exec);

const METADATA_PREFIX = "# RaycastID:";
const METADATA_REGEX = /# RaycastID:\s*(.+?)\s*\|\s*Name:\s*(.+?)\s*\|\s*Status:\s*(.+)/;

export async function readCrontab(): Promise<CronJob[]> {
  try {
    const { stdout } = await execAsync("crontab -l");
    return parseCrontab(stdout);
  } catch (error) {
    const err = error as { code?: number; stderr?: string };
    // crontab -l returns exit code 1 if no crontab exists for user
    if (err.code === 1 && err.stderr?.includes("no crontab")) {
      return [];
    }
    throw error;
  }
}

export async function writeCrontab(jobs: CronJob[]): Promise<void> {
  const fileContent = serializeCrontab(jobs);

  return new Promise((resolve, reject) => {
    const child = spawn("crontab", ["-"]);

    child.stdin.write(fileContent);
    child.stdin.end();

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`crontab command failed with exit code ${code}`));
      }
    });
  });
}

function parseCrontab(content: string): CronJob[] {
  const lines = content.split("\n");
  const jobs: CronJob[] = [];

  let pendingMetadata: { id: string; name: string; status: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith(METADATA_PREFIX)) {
      const match = trimmed.match(METADATA_REGEX);
      if (match) {
        pendingMetadata = {
          id: match[1],
          name: match[2],
          status: match[3],
        };
      }
      continue;
    }

    if (!trimmed.startsWith("#")) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 6) {
        const schedule = parts.slice(0, 5).join(" ");
        const command = parts.slice(5).join(" ");

        if (pendingMetadata) {
          jobs.push({
            id: pendingMetadata.id,
            name: pendingMetadata.name,
            schedule,
            command,
            status: pendingMetadata.status as CronJob["status"],
            type: "custom",
            lastRun: null,
            nextRun: null,
          });
          pendingMetadata = null;
        } else {
          jobs.push({
            id: Buffer.from(command).toString("base64").substring(0, 8),
            name: command.split(" ").pop() || "Imported Job",
            schedule,
            command,
            status: "active",
            type: "custom",
            lastRun: null,
            nextRun: null,
          });
        }
      }
    } else if (trimmed.startsWith("#") && pendingMetadata?.status === "paused") {
      const actualLine = trimmed.substring(1).trim();
      const parts = actualLine.split(/\s+/);
      if (parts.length >= 6) {
        const schedule = parts.slice(0, 5).join(" ");
        const command = parts.slice(5).join(" ");
        jobs.push({
          id: pendingMetadata.id,
          name: pendingMetadata.name,
          schedule,
          command,
          status: "paused",
          type: "custom",
          lastRun: null,
          nextRun: null,
        });
        pendingMetadata = null;
      }
    }
  }

  return jobs;
}

function serializeCrontab(jobs: CronJob[]): string {
  return (
    jobs
      .map((job) => {
        const metadata = `${METADATA_PREFIX} ${job.id} | Name: ${job.name} | Status: ${job.status}`;
        let line = `${job.schedule} ${job.command}`;

        if (job.status === "paused") {
          line = `# ${line}`;
        }

        return `${metadata}\n${line}`;
      })
      .join("\n\n") + "\n"
  ); // Trailing newline
}
