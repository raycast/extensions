import { exec } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Model } from "./models";

const execAsync = promisify(exec);

export async function runCodexCommand(command: string, args?: string[]): Promise<string> {
  const isWindows = process.platform === "win32";
  return isWindows ? runWindowsCommand(command, args) : runUnixCommand(command, args);
}

async function runWindowsCommand(command: string, args?: string[]): Promise<string> {
  const fullCommand = args?.length ? `${command} ${args.join(" ")}` : command;
  const { stdout, stderr } = await execAsync(fullCommand);
  return `${stdout.trim()}\n${stderr.trim()}`;
}

async function runUnixCommand(command: string, args: string[] = []): Promise<string> {
  const fullCommand = args?.length ? `${command} ${args.join(" ")}` : command;
  const unixCommand = `/bin/zsh -lc '${fullCommand}'`;
  const { stdout, stderr } = await execAsync(unixCommand);
  return `${stdout.trim()}\n${stderr.trim()}`;
}

export async function askQuestion(prompt: string, model: Model): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "raycast-codex-"));
  const outputPath = join(tempDir, "answer.md");

  try {
    await runCodexCommand("codex exec", [
      "--skip-git-repo-check",
      "--sandbox read-only",
      `--model ${model}`,
      "--ephemeral",
      "--color never",
      `-o "${outputPath}"`,
      `"${prompt}"`,
    ]);

    const answer = (await readFile(outputPath, "utf8")).trim();
    if (!answer) {
      throw new Error("Codex returned an empty answer.");
    }

    return answer;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
