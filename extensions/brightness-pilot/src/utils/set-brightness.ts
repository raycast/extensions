import { spawn } from "child_process";
import { getCli } from "./cli";

export async function setBrightness(displayID: number, brightness: number) {
  const cli = await getCli();
  try {
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const process = spawn(cli, ["set-brightness", displayID.toString(), brightness.toString()]);
      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      process.on("error", (err) => {
        reject(err);
      });
    });

    if (stderr) throw new Error(stderr);
    if (stdout.toLowerCase().includes("error")) throw new Error(stdout);
    const ok = Boolean(stdout.trim());
    return {
      ok,
      message: ok ? "Brightness set successfully" : "Failed to set brightness",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "An unknown error occurred while setting brightness.",
    };
  }
}