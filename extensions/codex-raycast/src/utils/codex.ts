import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Model } from "./models";

const execFileAsync = promisify(execFile);

let codexPath: string | undefined;

async function resolveCodexPath(): Promise<string> {
  if (codexPath) return codexPath;
  const { stdout } = await execFileAsync("/bin/zsh", ["-lc", "which codex"]);
  return stdout.trim();
}

export async function runCodexCommand(command: string, args: string[] = []): Promise<string> {
  return process.platform === "win32" ? runWindowsCodexCommand(command, args) : runUnixCodexCommand(command, args);
}

async function runWindowsCodexCommand(command: string, args: string[] = []): Promise<string> {
  const { stdout, stderr } = await execFileAsync("cmd.exe", ["/c", "codex", command, ...args]);
  return `${stdout.trim()}\n${stderr.trim()}`;
}

async function runUnixCodexCommand(command: string, args: string[] = []): Promise<string> {
  const codexPath = await resolveCodexPath();
  const { stdout, stderr } = await execFileAsync(codexPath, [command, ...args]);
  return `${stdout.trim()}\n${stderr.trim()}`;
}

export async function askQuestion(prompt: string, model: Model): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "raycast-codex-"));
  const outputPath = join(tempDir, "answer.md");

  try {
    await runCodexCommand("exec", [
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--model",
      model,
      "--ephemeral",
      "--color",
      "never",
      "-o",
      outputPath,
      prompt,
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
