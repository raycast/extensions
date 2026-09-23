import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type {
  SearchCompletion,
  SearchEngine,
  SearchEngineType,
  SearchError,
  SearchRequest,
  SearchResult,
} from "../types/search.ts";
import { buildRipgrepArgs } from "../utils/ripgrep-args.ts";
import { RipgrepJsonParser, type RipgrepParserRecord } from "../utils/ripgrep-json-parser.ts";
import { RipgrepResultMapper } from "../utils/ripgrep-result-mapper.ts";

type RipgrepEngineType = Extract<SearchEngineType, "bundled-ripgrep" | "system-ripgrep">;
type ExecutableResolver = () => Promise<string | undefined>;

const MAX_STDERR_BYTES = 64 * 1024;

function searchError(kind: SearchError["kind"], message: string): SearchError {
  return { kind, message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isInvalidRegex(stderr: string): boolean {
  return /regex parse error|error parsing regex|invalid regex|PCRE2.*error/i.test(stderr);
}

export class RipgrepEngine implements SearchEngine {
  public readonly type: RipgrepEngineType;
  private readonly resolveExecutable: ExecutableResolver;

  constructor(type: RipgrepEngineType, resolveExecutable: ExecutableResolver) {
    this.type = type;
    this.resolveExecutable = resolveExecutable;
  }

  async search(request: SearchRequest): Promise<SearchCompletion> {
    if (request.signal.aborted) return { limitReached: false, cancelled: true };

    let resolution: { cancelled: true } | { cancelled: false; executable: string | undefined };
    try {
      resolution = await new Promise((resolve, reject) => {
        let completed = false;
        const abort = () => {
          if (completed) return;
          completed = true;
          resolve({ cancelled: true });
        };
        request.signal.addEventListener("abort", abort, { once: true });
        this.resolveExecutable().then(
          (executable) => {
            if (completed) return;
            completed = true;
            request.signal.removeEventListener("abort", abort);
            resolve({ cancelled: false, executable });
          },
          (error: unknown) => {
            if (completed) return;
            completed = true;
            request.signal.removeEventListener("abort", abort);
            reject(error);
          },
        );
      });
    } catch (error) {
      throw searchError("engine-unavailable", `Unable to prepare ${this.type}: ${errorMessage(error)}`);
    }
    if (resolution.cancelled) return { limitReached: false, cancelled: true };
    const { executable } = resolution;
    if (!executable) throw searchError("engine-unavailable", `${this.type} is not available.`);
    if (request.signal.aborted) return { limitReached: false, cancelled: true };

    return this.run(executable, request);
  }

  private run(executable: string, request: SearchRequest): Promise<SearchCompletion> {
    return new Promise<SearchCompletion>((resolve, reject) => {
      const parser = new RipgrepJsonParser();
      const stderrDecoder = new StringDecoder("utf8");
      let stderr = "";
      let malformedRecords = 0;
      let emittedResults = 0;
      let didSpawn = false;
      let settled = false;
      let cancellationRequested = false;
      let limitReached = false;
      let forceKillTimer: NodeJS.Timeout | undefined;

      const child = spawn(executable, buildRipgrepArgs(request.query, request.directory, request.options), {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const settle = (completion?: SearchCompletion, error?: SearchError) => {
        if (settled) return;
        settled = true;
        request.signal.removeEventListener("abort", abort);
        if (forceKillTimer) clearTimeout(forceKillTimer);
        if (error) reject(error);
        else resolve(completion ?? { limitReached: false, cancelled: false });
      };

      const terminate = () => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        child.kill("SIGTERM");
        forceKillTimer ??= setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }, 500);
        forceKillTimer.unref();
      };

      const emit = (results: SearchResult[]) => {
        if (settled || cancellationRequested || limitReached || results.length === 0) return;
        const remaining = request.options.maxResults - emittedResults;
        if (remaining <= 0) return;
        const batch = results.slice(0, remaining);
        if (batch.length > 0) {
          emittedResults += batch.length;
          request.onResults(batch);
        }
        if (emittedResults >= request.options.maxResults) {
          limitReached = true;
          terminate();
        }
      };

      const mapper = new RipgrepResultMapper(
        request.directory,
        request.options.contextBefore,
        request.options.contextAfter,
        emit,
      );

      const consumeRecords = (records: RipgrepParserRecord[]) => {
        for (const record of records) {
          if (record.kind === "malformed") {
            malformedRecords += 1;
          } else if (record.kind === "event" && !mapper.consume(record.event)) {
            malformedRecords += 1;
          }
          // Unknown event kinds are forward-compatible and intentionally ignored.
        }
      };

      const abort = () => {
        cancellationRequested = true;
        terminate();
      };
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort();

      child.once("spawn", () => {
        didSpawn = true;
      });
      child.stdout.on("data", (chunk: Buffer) => {
        if (!settled && !cancellationRequested && !limitReached) consumeRecords(parser.push(chunk));
      });
      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length >= MAX_STDERR_BYTES) return;
        stderr += stderrDecoder.write(chunk).slice(0, MAX_STDERR_BYTES - stderr.length);
      });
      child.once("error", (error) => {
        settle(
          undefined,
          searchError(
            didSpawn ? "engine-crashed" : "engine-startup-failed",
            `${this.type} ${didSpawn ? "failed" : "could not start"}: ${error.message}`,
          ),
        );
      });
      child.once("close", (code) => {
        stderr += stderrDecoder.end().slice(0, MAX_STDERR_BYTES - stderr.length);

        if (!cancellationRequested && !limitReached) {
          consumeRecords(parser.finish());
          mapper.finish();
        }
        if (cancellationRequested) {
          settle({ limitReached: false, cancelled: true });
          return;
        }
        if (limitReached) {
          settle({ limitReached: true, cancelled: false });
          return;
        }
        if (code === 0 || code === 1) {
          if (malformedRecords > 0) {
            settle(
              undefined,
              searchError("unexpected", `${this.type} produced ${malformedRecords} malformed JSON event(s).`),
            );
          } else {
            settle({ limitReached: false, cancelled: false });
          }
          return;
        }

        const detail = stderr.trim() || `exit code ${code ?? "unknown"}`;
        if (request.options.searchMode === "regex" && isInvalidRegex(stderr)) {
          settle(undefined, searchError("invalid-query", `Invalid regular expression: ${detail}`));
        } else {
          settle(undefined, searchError("engine-crashed", `${this.type} failed: ${detail}`));
        }
      });
    });
  }
}
