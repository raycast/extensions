import { run as runWasm } from "./load-wasm";
import { Entry } from "./types";
import { spawn } from "node:child_process";
import { ensureBinaryAvailable } from "./binary";

const MAX_RESULTS = 100;

export async function run(argv: string[]): Promise<Entry[]> {
  try {
    const { execSource, wasmBinary, execPath } = await ensureBinaryAvailable();

    if (execSource === "wasm") {
      return runWasm(wasmBinary, argv);
    } else if (
      execSource === "bundled" ||
      execSource === "path" ||
      execSource === "custom"
    ) {
      if (execSource === "path" || execSource === "custom") {
        // -l is a custom argument that limits results, which may not be supported in user-provided binaries
        const index = argv.indexOf("-l");
        if (index !== -1) {
          argv.splice(index, 2);
        }
      }

      return new Promise<Entry[]>((resolve, reject) => {
        const child = spawn(execPath, argv.slice(1));
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
