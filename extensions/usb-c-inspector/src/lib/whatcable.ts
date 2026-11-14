import { execFile } from "child_process";
import { promisify } from "util";

import { ensureCli } from "./ensure-cli";
import { isAppleSilicon } from "./resolve-cli";
import type { WhatCableOutput } from "./types";

const execFileAsync = promisify(execFile);

export class WhatCableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatCableError";
  }
}

export async function fetchWhatCableOutput(options?: { forceDownload?: boolean }): Promise<{
  cliPath: string;
  output: WhatCableOutput;
  raw: string;
}> {
  if (!isAppleSilicon()) {
    throw new WhatCableError(
      "WhatCable requires an Apple Silicon Mac. USB-PD and cable e-marker data are not available on Intel Macs.",
    );
  }

  const cliPath = await ensureCli({ forceDownload: options?.forceDownload });

  let stdout: string;
  try {
    // Prefer `--json` alone: Pro hints are already suppressed for JSON output,
    // and `--silence-pro-hints` prints a confirmation line to stdout.
    const result = await execFileAsync(cliPath, ["--json"], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
      env: {
        ...process.env,
        // Keep CLI output stable / machine-readable.
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
      },
    });
    stdout = result.stdout;
  } catch (error) {
    const err = error as { stderr?: string; message?: string; code?: string };
    if (err.code === "ETIMEDOUT") {
      throw new WhatCableError("WhatCable CLI timed out while reading ports.");
    }
    const detail = (err.stderr || err.message || "Unknown error").trim();
    throw new WhatCableError(`WhatCable CLI failed: ${detail}`);
  }

  let output: WhatCableOutput;
  try {
    output = JSON.parse(stdout) as WhatCableOutput;
  } catch {
    throw new WhatCableError("Could not parse WhatCable JSON output.");
  }

  if (!Array.isArray(output.ports)) {
    throw new WhatCableError("WhatCable JSON is missing the ports array.");
  }

  return { cliPath, output, raw: stdout };
}
