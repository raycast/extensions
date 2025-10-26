import { run as runWasm } from "./load-wasm";
import { Entry } from "./types";
import { spawn } from "node:child_process";
import { ensureBinaryAvailable } from "./binary";
import { getPreferenceValues } from "@raycast/api";

function parseLimit(): number {
  const preferences = getPreferenceValues<Preferences>();
  const limitStr = preferences.searchResultLimitStr;
  const limit = parseInt(limitStr || "100", 10);
  return isNaN(limit) || limit <= 0 ? 100 : limit;
}

export async function run(argv: string[]): Promise<Entry[]> {
  const MAX_RESULTS = parseLimit();
  try {
    const binaryInfo = await ensureBinaryAvailable();

    if (binaryInfo.execSource === "wasm") {
      return runWasm(binaryInfo.wasmBinary, argv);
    } else if (
      binaryInfo.execSource === "bundled" ||
      binaryInfo.execSource === "path" ||
      binaryInfo.execSource === "custom"
    ) {
      if (binaryInfo.execSource === "bundled") {
        // -l is a custom argument that limits results, which may not be supported in user-provided binaries
        const index = argv.indexOf("-as");
        if (index >= 0) {
          argv.splice(index, 0, "-l", MAX_RESULTS.toString());
        }
      }

      return new Promise<Entry[]>((resolve, reject) => {
        const child = spawn(binaryInfo.execPath, argv.slice(1));
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
          const lines = stdout.split(/\r?\n/);
          if (lines.length > MAX_RESULTS) {
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
