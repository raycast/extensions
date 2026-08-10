import { spawn } from "child_process";
import { Model } from "../../type";
import { getApfelPath } from ".";

export function askApfelStreaming(
  prompt: string,
  model: Model | undefined,
  onChunk: (partialAnswer: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = ["--stream", "--quiet", "--no-color"];
    if (model?.prompt) args.push("-s", model.prompt);
    if (model?.temperature) args.push("--temperature", model.temperature);
    if (model?.max_tokens) args.push("--max-tokens", model.max_tokens);
    args.push(prompt);

    const proc = spawn(getApfelPath(), args, {
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let accumulated = "";
    let stderrOutput = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      accumulated += chunk.toString();
      onChunk(accumulated);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve(accumulated.trim());
      else reject(new Error(stderrOutput.trim() || `apfel exited with code ${code}`));
    });

    proc.on("error", reject);
  });
}
