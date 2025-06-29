import { spawn } from "child_process";
import { Monitor } from "../types";
import { getCli } from "./cli";

export async function getMonitors() {
  const cli = await getCli();
  try {
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const process = spawn(cli, ["detect-displays"]);
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
    return JSON.parse(stdout) as Monitor[];
  } catch {
    throw new Error("Something went wrong while trying to get monitors. Please try again later.");
  }
}