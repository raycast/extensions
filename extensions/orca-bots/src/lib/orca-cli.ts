import { execFile } from "node:child_process";
import { existsSync } from "node:fs";

export const DEFAULT_ORCA_PATH = "/Applications/Orca.app/Contents/Resources/bin/orca";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

/**
 * Erreur typée de la CLI Orca.
 * Codes internes : `binary_not_found` (absent, non exécutable ou dossier), `invalid_output`, `timeout`.
 * Sinon, le `error.code` renvoyé par Orca dans son enveloppe.
 */
export class OrcaCliError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OrcaCliError";
    this.code = code;
  }
}

type Envelope = {
  ok: boolean;
  result?: unknown;
  error?: { code?: unknown; message?: unknown };
};

const isEnvelope = (value: unknown): value is Envelope =>
  typeof value === "object" && value !== null && typeof (value as Envelope).ok === "boolean";

/** Extrait `result` d'une enveloppe `{ ok, result | error }`, ou lève une OrcaCliError. */
export function parseEnvelope<T>(stdout: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    const excerpt = stdout.trim().slice(0, 200);
    throw new OrcaCliError(
      "invalid_output",
      excerpt ? `Unexpected output from Orca CLI: ${excerpt}` : "Orca CLI returned no output.",
    );
  }

  if (!isEnvelope(parsed)) {
    throw new OrcaCliError("invalid_output", "Orca CLI returned an unexpected response format.");
  }

  if (parsed.ok) {
    return parsed.result as T;
  }

  const code = typeof parsed.error?.code === "string" ? parsed.error.code : "unknown_error";
  const message = typeof parsed.error?.message === "string" ? parsed.error.message : "Unknown Orca error.";
  throw new OrcaCliError(code, message);
}

/** Préférence non vide, sinon le chemin par défaut. */
export function resolveOrcaPath(preference?: string): string {
  const trimmed = preference?.trim();
  return trimmed ? trimmed : DEFAULT_ORCA_PATH;
}

type RunOptions = { orcaPath?: string; timeoutMs?: number };

type ExecFailure = NodeJS.ErrnoException & { killed?: boolean };

/**
 * Appelle la CLI Orca avec `--json` et renvoie le `result` de l'enveloppe.
 * Toute défaillance (binaire absent, timeout, sortie non JSON) devient une OrcaCliError.
 */
export function runOrca<T>(args: string[], options: RunOptions = {}): Promise<T> {
  const orcaPath = resolveOrcaPath(options.orcaPath);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const binaryMissing = new OrcaCliError("binary_not_found", `Orca CLI not found: ${orcaPath}`);
  if (!existsSync(orcaPath)) {
    return Promise.reject(binaryMissing);
  }

  return new Promise<T>((resolve, reject) => {
    execFile(
      orcaPath,
      [...args, "--json"],
      { timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES, env: process.env },
      (error, stdout, stderr) => {
        if (error) {
          const failure = error as ExecFailure;
          // Chemin absent, non exécutable (EACCES) ou dossier (EISDIR) : même état « CLI introuvable ».
          if (failure.code === "ENOENT" || failure.code === "EACCES" || failure.code === "EISDIR") {
            reject(binaryMissing);
            return;
          }
          if (failure.killed) {
            reject(new OrcaCliError("timeout", `Orca CLI did not respond within ${Math.round(timeoutMs / 1000)}s.`));
            return;
          }
          // Orca peut sortir en code non nul tout en écrivant une enveloppe d'erreur lisible sur stdout.
          if (stdout.trim()) {
            try {
              resolve(parseEnvelope<T>(stdout));
            } catch (parseError) {
              reject(parseError);
            }
            return;
          }
          const detail = stderr.trim() || failure.message;
          reject(new OrcaCliError("invalid_output", `Orca CLI failed: ${detail.slice(0, 200)}`));
          return;
        }

        try {
          resolve(parseEnvelope<T>(stdout));
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
}
