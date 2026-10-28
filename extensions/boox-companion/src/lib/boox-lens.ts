import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import path from "node:path";
import { getConnectedBoox } from "../discovery/discover";
import { BooxError } from "./errors";

export type BooxLensMode = "view" | "capture" | "crop";

interface LensResult {
  status: "copied" | "saved" | "cancelled" | "opened";
  width?: number;
  height?: number;
  path?: string;
}

export async function runBooxLens(mode: BooxLensMode): Promise<LensResult> {
  const { client, device } = await getConnectedBoox();
  if (!(await client.isScreenAvailable(1_000))) {
    throw new BooxError("Start Screen Mirroring in BOOXDrop first");
  }

  const executable = path.join(environment.assetsPath, "boox-lens");
  const args = ["--mode", mode, "--url", `${device.screenHost}/mjpeg`, "--title", `${device.model} Screen`];
  const childEnvironment = {
    ...process.env,
    ...(client.authorizationHeader() ? { BOOX_AUTHORIZATION: client.authorizationHeader() } : {}),
  };

  if (mode === "view") {
    return new Promise<LensResult>((resolve, reject) => {
      const child = spawn(executable, args, {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnvironment,
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeout = setTimeout(() => finish(new BooxError("BOOX Screen did not become ready")), 15_000);

      const finish = (error?: Error, result?: LensResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        child.removeAllListeners();
        child.stdout.removeAllListeners();
        child.stderr.removeAllListeners();
        if (error) {
          child.kill();
          reject(error);
          return;
        }
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        resolve(result!);
      };

      child.once("error", (error) => finish(error));
      child.once("close", (code) => {
        finish(new BooxError(stderr.trim() || `BOOX Lens exited with status ${code}`));
      });
      child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
        const newline = stdout.indexOf("\n");
        if (newline < 0) return;
        try {
          const result = JSON.parse(stdout.slice(0, newline)) as LensResult;
          if (result.status !== "opened") throw new Error("Unexpected BOOX Lens status");
          finish(undefined, result);
        } catch {
          finish(new BooxError("BOOX Lens returned an invalid ready signal"));
        }
      });
    });
  }

  return new Promise<LensResult>((resolve, reject) => {
    const child = spawn(executable, args, { env: childEnvironment, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new BooxError(stderr.trim() || `BOOX Lens exited with status ${code}`));
      try {
        resolve(JSON.parse(stdout.trim()) as LensResult);
      } catch {
        reject(new BooxError("BOOX Lens returned an invalid result"));
      }
    });
  });
}
