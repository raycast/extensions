import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function openProject(cliPath: string, projectPath: string) {
  const command = `"${cliPath}" open --project "${projectPath}"`;
  const { stderr, stdout } = await execAsync(command);
  console.log("🚀 ~ openProject ~ stdout:", stdout);
  console.log("🚀 ~ openProject ~ stderr:", stderr);

  const ideStarted = stderr && stderr.includes("IDE server has started");

  if (stderr && !ideStarted) {
    throw new Error(stderr);
  }

  if (stderr && ideStarted && stderr.includes("✔ open")) {
    return true;
  }

  if (stderr && ideStarted && stderr.includes("✖ preparing")) {
    throw new Error(stderr);
  }

  throw new Error(stderr || stdout);
}
