import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { invalidateNumiCliPath, requireNumiCliPath } from "./checkinstall";

const execFileAsync = promisify(execFile);

/**
 * Port exposed by Numi's "Enable Alfred Integration" preference.
 *
 * @deprecated Numi 3.34 opens no listening socket at all, even with the
 * setting enabled, and upstream documents its own Alfred extension as
 * requiring numi-cli. Numi published no deprecation notice, so it is unclear
 * whether this was removed deliberately or regressed - the code stays for
 * anyone on an older build where it still answers. Prefer queryWithNumiCli.
 */
const NUMI_API_PORT = 15055;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Recent Numi builds (verified on 3.34) never open this port, even with
 * "Enable Alfred Integration" checked - upstream now documents the Alfred
 * extension as requiring numi-cli. Point people at the CLI rather than at a
 * preference that no longer does anything.
 */
export const NUMI_API_UNREACHABLE =
  "Could not reach Numi's API. Recent versions of Numi no longer serve it, even with “Enable Alfred Integration” checked. Install numi-cli (brew install nikolaeu/numi/numi-cli) and turn on “Use numi-cli” in this extension's preferences.";

export function isConnectionRefused(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ECONNREFUSED";
}

/**
 * Node reports a refused localhost connection as an AggregateError with an
 * empty message, which surfaces to the user (and to AI tools) as a bare
 * "Error". Replace it with something actionable while keeping `code` intact so
 * isConnectionRefused still works on the result.
 */
function describeRequestError(error: unknown): Error {
  const cause = error as NodeJS.ErrnoException;

  if (isConnectionRefused(error)) {
    const described: NodeJS.ErrnoException = new Error(NUMI_API_UNREACHABLE, { cause });
    described.code = cause.code;
    return described;
  }

  if (cause instanceof Error && cause.message.trim().length > 0) return cause;

  const described: NodeJS.ErrnoException = new Error(`Could not reach Numi${cause?.code ? ` (${cause.code})` : ""}.`, {
    cause,
  });
  described.code = cause?.code;
  return described;
}

export function query(expression?: string): Promise<string[]> {
  const trimmed = expression?.trim();
  if (!trimmed) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        port: NUMI_API_PORT,
        method: "GET",
        path: `/?q=${encodeURIComponent(trimmed)}`,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", (error) => reject(describeRequestError(error)));
        response.on("end", () => resolve([Buffer.concat(chunks).toString("utf8").trim()]));
      },
    );

    request.on("timeout", () => request.destroy(new Error("Numi did not respond in time.")));
    request.on("error", (error) => reject(describeRequestError(error)));
    request.end();
  });
}

async function runNumiCli(expression: string): Promise<string[]> {
  const binary = await requireNumiCliPath();
  // Passed as an argv entry rather than interpolated into a shell command, so
  // backticks, $(), ; and | in the query text cannot be executed.
  const { stdout, stderr } = await execFileAsync(binary, [expression]);

  if (stderr) {
    console.error(stderr);
    return [];
  }

  return [stdout.trimEnd()];
}

export async function queryWithNumiCli(expression?: string): Promise<string[]> {
  const trimmed = expression?.trim();
  if (!trimmed) return [];

  try {
    return await runNumiCli(trimmed);
  } catch (error) {
    // The resolved path is cached, so it can outlive the binary if numi-cli is
    // uninstalled or moved mid-session. Re-resolve once before giving up rather
    // than surfacing a bare ENOENT.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    invalidateNumiCliPath();
    return runNumiCli(trimmed);
  }
}

export async function runQuery(expression: string, useNumiCli: boolean): Promise<string[]> {
  return useNumiCli ? queryWithNumiCli(expression) : query(expression);
}

export async function isNumiApiAvailable(): Promise<boolean> {
  try {
    await query("1");
    return true;
  } catch {
    return false;
  }
}
