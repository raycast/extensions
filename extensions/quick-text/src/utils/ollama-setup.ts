import { spawn } from "node:child_process";

export type SupportedPlatform = "darwin" | "win32";

export type RecommendedModel = "granite4" | "granite4:350m";

interface RunCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function getSupportedPlatform(platform: NodeJS.Platform): SupportedPlatform {
  if (platform === "darwin" || platform === "win32") {
    return platform;
  }
  throw new Error("Unsupported OS. This command supports macOS and Windows.");
}

function runShellCommand(
  command: string,
  platform: SupportedPlatform,
): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const child =
      platform === "win32"
        ? spawn("powershell", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            command,
          ])
        : spawn("sh", ["-c", command]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

export function getOllamaInstallCommand(platform: NodeJS.Platform): string {
  const supportedPlatform = getSupportedPlatform(platform);
  if (supportedPlatform === "darwin") {
    return "curl -fsSL https://ollama.com/install.sh | sh";
  }

  return "irm https://ollama.com/install.ps1 | iex";
}

function getOllamaCheckCommand(platform: SupportedPlatform): string {
  if (platform === "darwin") {
    return "command -v ollama";
  }

  return "Get-Command ollama -ErrorAction SilentlyContinue";
}

export async function setupOllamaAndPullModel(
  model: RecommendedModel,
): Promise<void> {
  const platform = getSupportedPlatform(process.platform);
  const checkResult = await runShellCommand(
    getOllamaCheckCommand(platform),
    platform,
  );

  if (checkResult.exitCode !== 0) {
    const installResult = await runShellCommand(
      getOllamaInstallCommand(platform),
      platform,
    );
    if (installResult.exitCode !== 0) {
      throw new Error(
        errorOutput(installResult) || "Failed to install Ollama automatically.",
      );
    }
  }

  const pullResult = await runShellCommand(`ollama pull ${model}`, platform);
  if (pullResult.exitCode !== 0) {
    throw new Error(
      errorOutput(pullResult) || `Failed to pull model ${model}.`,
    );
  }
}

function errorOutput({ stdout, stderr }: RunCommandResult): string {
  return [stdout, stderr].filter(Boolean).join("\n");
}
