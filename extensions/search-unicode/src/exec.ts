import { run as runWasm } from "./load-wasm";
import { environment } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { Entry, PreferenceValues } from "./types";
import { spawn } from "node:child_process";
import os from "node:os";

const MAX_RESULTS = 100;

const BINARIES: Record<string, Record<string, string>> = {
  darwin: {
    x64: "uni-eb04126-darwin-amd64",
    arm64: "uni-eb04126-darwin-arm64",
  },
  windows: {
    x64: "uni-eb04126-windows-amd64.exe",
    arm64: "uni-eb04126-windows-arm64.exe",
  },
};

export async function run(argv: string[]): Promise<Entry[]> {
  try {
    const platform = os.platform();
    const arch = os.arch();
    const prefs = getPreferenceValues<PreferenceValues>();
    let execSource = prefs.execSource;
    if (execSource === "bundled" && !BINARIES[platform]?.[arch]) {
      console.log(
        `No bundled binary available for platform ${platform} and architecture ${arch}, falling back to WASM`,
      );
      execSource = "wasm";
    }

    if (execSource === "wasm") {
      return runWasm(argv);
    } else if (
      execSource === "bundled" ||
      execSource === "path" ||
      execSource === "custom"
    ) {
      const path =
        execSource === "path"
          ? "uni"
          : execSource === "bundled"
            ? environment.assetsPath + BINARIES[platform][arch]
            : execSource === "custom"
              ? prefs.execPath
              : "uni";

      if (execSource === "path" || execSource === "custom") {
        // -l is a custom argument that limits results, which may not be supported in user-provided binaries
        const index = argv.indexOf("-l");
        if (index !== -1) {
          argv.splice(index, 2);
        }
      }

      return new Promise<Entry[]>((resolve, reject) => {
        const child = spawn(path, argv.slice(1));
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
          const lines = stdout.split(/\r?\n/);
          if (lines.length > MAX_RESULTS) {
            console.log("Max results reached, pausing stdout");
            try {
              child.stdout.pause();
            } catch {
              // ignore
            }
            if (!child.killed) {
              try {
                child.kill();
              } catch {
                // ignore
              }
              child.emit("close", 0);
            }
          }
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("error", (error) => {
          reject(new Error(`Failed to spawn process: ${error.message}`));
        });

        child.on("close", (code) => {
          console.log(`Process closed with code ${code}`);
          if (code !== 0) {
            reject(
              new Error(
                `Process exited with code ${code}${stderr ? `: ${stderr}` : ""}`,
              ),
            );
            return;
          }

          if (stderr) {
            reject(new Error(`Process wrote to stderr: ${stderr}`));
            return;
          }

          try {
            let lines = stdout.split(/\r?\n/);
            if (lines.length > MAX_RESULTS) {
              console.log("Truncating output to max results for JSON parsing");
              lines = lines.slice(0, MAX_RESULTS);
              lines[lines.length - 1] = lines[lines.length - 1].replace(
                /\},?$/,
                "}]",
              );
            }
            const entries: Entry[] = JSON.parse(lines.join("\n"));
            resolve(entries.slice(0, MAX_RESULTS));
          } catch (error) {
            reject(
              new Error(
                `Failed to parse JSON output: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        });
      });
    }
    throw new Error("Unsupported execution source");
  } catch (error) {
    console.error("Execution error:", error);
    throw error;
  }
}
