import { execFile, spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class ConvtNotFoundError extends Error {
  constructor(message = "Install Convt, or set its executable path in the extension preferences.") {
    super(message);
    this.name = "ConvtNotFoundError";
  }
}

export type Format = { id: string; name: string; category: string; extensions: string[] };
export type FileInspection = {
  sources: { file: string; extension: string; format: Format | null }[];
  targets: Format[];
  suggestedTargetIds: string[];
};
export type ConversionOptions = {
  quality?: number;
  maxSize?: number;
  pages?: string;
  dpi?: number;
};
export type ConversionRequest = ConversionOptions & {
  files: string[];
  target: string;
  outputDirectory?: string;
};
export type ConversionResult =
  | { status: "done"; input: string; outputs: string[] }
  | { status: "failed" | "cancelled"; input: string; message: string };
export type ConversionProgress = { input: string; completed: number; total: number; fraction: number | null };

export function expandPath(value: string): string {
  return value === "~" ? homedir() : value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}

export function cliEnvironment(): NodeJS.ProcessEnv {
  const extra =
    process.platform === "win32"
      ? []
      : ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/Applications/LibreOffice.app/Contents/MacOS"];
  // Windows environment keys are case-insensitive; pass only one spelling of PATH.
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
  const searchPath = process.env.PATH || process.env.Path || "";
  return { ...environment, PATH: [...searchPath.split(path.delimiter), ...extra].join(path.delimiter) };
}

export async function resolveBinary(configuredPath?: string): Promise<string> {
  const configured = configuredPath?.trim();
  if (configured && !path.isAbsolute(expandPath(configured))) {
    throw new ConvtNotFoundError("Convt CLI Path must be an absolute path to the executable.");
  }
  const executable = process.platform === "win32" ? "convt.exe" : "convt";
  const appPaths =
    process.platform === "win32"
      ? [
          path.join(
            process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"),
            "Programs",
            "convt",
            executable,
          ),
          path.join(process.env.ProgramFiles || "C:\\Program Files", "convt", executable),
        ]
      : [
          "/Applications/convt.app/Contents/MacOS/convt",
          path.join(homedir(), "Applications/convt.app/Contents/MacOS/convt"),
        ];
  const candidates = configured
    ? [expandPath(configured)]
    : [
        ...appPaths,
        ...(cliEnvironment().PATH || "")
          .split(path.delimiter)
          .filter(Boolean)
          .map((dir) => path.join(dir, executable)),
      ];
  for (const candidate of candidates) {
    try {
      await access(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue to the next installation location.
    }
  }
  throw new ConvtNotFoundError(
    configured ? `No executable found at ${configured}. Update Convt CLI Path in preferences.` : undefined,
  );
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

async function query(binary: string, args: string[], signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) throw abortError(signal);
  try {
    const { stdout } = await execFileAsync(binary, args, {
      env: cliEnvironment(),
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      signal,
    });
    return stdout;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof Error && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim()) {
      throw new Error(error.stderr.trim());
    }
    throw error;
  }
}

export function parseFormats(text: string): Format[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("Convt returned an invalid format list. Update Convt and try again.");
  return data.map((value: unknown) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      typeof value.id !== "string" ||
      !/^[a-z0-9]+$/.test(value.id) ||
      !("name" in value) ||
      typeof value.name !== "string" ||
      !("category" in value) ||
      typeof value.category !== "string" ||
      !("extensions" in value) ||
      !Array.isArray(value.extensions) ||
      !value.extensions.every((extension: unknown) => typeof extension === "string")
    )
      throw new Error("Convt returned an invalid format. Update Convt and try again.");
    return { id: value.id, name: value.name, category: value.category, extensions: value.extensions };
  });
}

export async function getFormats(binary: string, signal?: AbortSignal): Promise<Format[]> {
  return parseFormats(await query(binary, ["formats", "--json"], signal));
}

export async function validateFiles(files: string[]): Promise<string[]> {
  if (!files.length) throw new Error("Choose at least one file.");
  const normalized = [
    ...new Set(
      files.map((file) => {
        const expanded = expandPath(file);
        if (!path.isAbsolute(expanded) || expanded.includes("\0"))
          throw new Error("Choose files using absolute paths.");
        return path.normalize(expanded);
      }),
    ),
  ];
  for (const file of normalized) {
    const info = await stat(file).catch(() => {
      throw new Error(`Cannot read ${file}. Check that it still exists.`);
    });
    if (!info.isFile()) throw new Error(`${path.basename(file)} is not a file. Choose individual files, not folders.`);
    await access(file, constants.R_OK);
  }
  return normalized;
}

export async function getTargets(binary: string, files: string[], signal?: AbortSignal): Promise<Format[]> {
  const inputs = await validateFiles(files);
  if (signal?.aborted) throw abortError(signal);
  const formats = await getFormats(binary, signal);
  // Targets depend on the source format and installed engines, not file contents.
  const byExtension = new Map<string, string>();
  for (const file of inputs) byExtension.set(path.extname(file).toLowerCase(), file);
  const targets: string[][] = [];
  for (const file of byExtension.values()) {
    targets.push(await queryTargetIds(binary, file, false, signal));
  }
  return commonFormats(formats, targets);
}

async function queryTargetIds(binary: string, file: string, menu: boolean, signal?: AbortSignal): Promise<string[]> {
  return (await query(binary, ["targets", file, ...(menu ? ["--menu"] : [])], signal))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function commonTargetIds(lists: string[][]): Set<string> {
  let common = new Set(lists[0]);
  for (const list of lists.slice(1)) {
    const ids = new Set(list);
    common = new Set([...common].filter((id) => ids.has(id)));
  }
  return common;
}

function commonFormats(formats: Format[], lists: string[][]): Format[] {
  const common = commonTargetIds(lists);
  return formats
    .filter((format) => common.has(format.id))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function inspectFiles(binary: string, files: string[], signal?: AbortSignal): Promise<FileInspection> {
  const inputs = await validateFiles(files);
  if (signal?.aborted) throw abortError(signal);
  const formats = await getFormats(binary, signal);
  const sources = inputs.map((file) => {
    const extension = path.extname(file).slice(1).toLowerCase();
    const format =
      formats.find((format) => format.extensions.some((alias) => alias.toLowerCase() === extension)) ?? null;
    return { file, extension, format };
  });
  if (sources.some((source) => source.format === null)) return { sources, targets: [], suggestedTargetIds: [] };

  const byExtension = new Map(sources.map((source) => [source.extension, source.file]));
  const targetLists: string[][] = [];
  const menus: string[][] = [];
  for (const file of byExtension.values()) {
    targetLists.push(await queryTargetIds(binary, file, false, signal));
    menus.push(await queryTargetIds(binary, file, true, signal));
  }
  const targets = commonFormats(formats, targetLists);
  const supported = new Set(targets.map((format) => format.id));
  const suggestedTargetIds = [...commonTargetIds(menus)].filter((id) => supported.has(id));
  return { sources, targets, suggestedTargetIds };
}

export function validateOptions(options: ConversionOptions): void {
  for (const [label, value, min, max] of [
    ["Quality", options.quality, 1, 100],
    ["Maximum image size", options.maxSize, 1, 4_294_967_295],
    ["DPI", options.dpi, 18, 1200],
  ] satisfies [string, number | undefined, number, number][]) {
    if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
      throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
    }
  }
  if (options.pages !== undefined) {
    const match = /^([1-9]\d*)(?:-([1-9]\d*)?)?$/.exec(options.pages);
    if (
      !match ||
      Number(match[1]) > 4_294_967_295 ||
      (match[2] && (Number(match[2]) < Number(match[1]) || Number(match[2]) > 4_294_967_295))
    ) {
      throw new Error("PDF pages must be a page or range, such as 2, 1-3, or 4-.");
    }
  }
}

export function conversionArgs(request: ConversionRequest): string[] {
  validateOptions(request);
  if (!/^[a-z0-9]+$/.test(request.target)) throw new Error("Choose a valid output format.");
  const args = ["--json", "--jobs", "1", "--to", request.target];
  if (request.outputDirectory) args.push("--out-dir", request.outputDirectory);
  if (request.quality !== undefined) args.push("--quality", String(request.quality));
  if (request.maxSize !== undefined) args.push("--max-size", String(request.maxSize));
  if (request.pages !== undefined) args.push("--pages", request.pages);
  if (request.dpi !== undefined) args.push("--dpi", String(request.dpi));
  return [...args, "--", ...request.files];
}

type Event =
  | { event: "started"; index: number }
  | { event: "progress"; index: number; fraction: number | null }
  | { event: "done"; index: number; outputs: string[] }
  | { event: "failed"; index: number; message: string; cancelled: boolean };

export function parseEvent(line: string): Event | null {
  const value: unknown = JSON.parse(line);
  if (!value || typeof value !== "object" || !("event" in value)) throw new Error("Invalid Convt event.");
  if (value.event === "summary") return null;
  if (!("index" in value) || typeof value.index !== "number" || !Number.isInteger(value.index) || value.index < 0)
    throw new Error("Invalid Convt event index.");
  const index = value.index;
  switch (value.event) {
    case "started":
      return { event: "started", index };
    case "progress":
      if (
        !("fraction" in value) ||
        !(value.fraction === null || (typeof value.fraction === "number" && value.fraction >= 0 && value.fraction <= 1))
      )
        break;
      return { event: "progress", index, fraction: value.fraction };
    case "done":
      if (
        !("outputs" in value) ||
        !Array.isArray(value.outputs) ||
        !value.outputs.length ||
        !value.outputs.every((output: unknown) => typeof output === "string" && path.isAbsolute(output))
      )
        break;
      return { event: "done", index, outputs: value.outputs };
    case "failed":
      if (!("message" in value) || typeof value.message !== "string") break;
      return {
        event: "failed",
        index,
        message: value.message,
        cancelled: "kind" in value && value.kind === "cancelled",
      };
  }
  throw new Error("Unrecognized Convt event. Update Convt and try again.");
}

export async function convertFiles(
  binary: string,
  request: ConversionRequest,
  callbacks: { signal?: AbortSignal; onProgress?: (progress: ConversionProgress) => void } = {},
): Promise<ConversionResult[]> {
  validateOptions(request);
  const files = await validateFiles(request.files);
  const target = request.target.trim().toLowerCase();
  const cancelled = (): ConversionResult[] =>
    files.map((input) => ({ status: "cancelled", input, message: "Conversion cancelled." }));
  if (callbacks.signal?.aborted) return cancelled();
  let targets: Format[];
  try {
    targets = await getTargets(binary, files, callbacks.signal);
  } catch (error) {
    if (callbacks.signal?.aborted) return cancelled();
    throw error;
  }
  if (!targets.some((format) => format.id === target))
    throw new Error(`These files cannot all convert to ${target}. Choose one of their available formats.`);
  const outputDirectory = request.outputDirectory ? expandPath(request.outputDirectory) : undefined;
  if (outputDirectory) {
    if (!path.isAbsolute(outputDirectory)) throw new Error("Choose an existing output folder.");
    const info = await stat(outputDirectory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return undefined;
      throw error;
    });
    if (!info?.isDirectory()) throw new Error("Choose an existing output folder.");
    await access(outputDirectory, constants.W_OK);
  }
  const args = conversionArgs({ ...request, files, target, outputDirectory });
  if (callbacks.signal?.aborted) return cancelled();

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { env: cliEnvironment(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const results = new Map<number, ConversionResult>();
    let stderr = "";
    let protocolError = "";
    const cancel = () => {
      if (process.platform === "win32" && child.pid) {
        // Node's SIGINT terminates immediately on Windows; stop engine children too.
        execFile("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, (error) => {
          if (error) child.kill();
        });
      } else {
        child.kill("SIGINT");
      }
    };
    callbacks.signal?.addEventListener("abort", cancel, { once: true });
    const lines = createInterface({ input: child.stdout });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-8000);
    });
    lines.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const event = parseEvent(line);
        if (!event) return;
        const input = files[event.index];
        if (!input) throw new Error("Convt returned an unexpected file index.");
        if (event.event === "done") results.set(event.index, { status: "done", input, outputs: event.outputs });
        if (event.event === "failed")
          results.set(event.index, { status: event.cancelled ? "cancelled" : "failed", input, message: event.message });
        callbacks.onProgress?.({
          input,
          completed: results.size,
          total: files.length,
          fraction: event.event === "progress" ? event.fraction : null,
        });
      } catch (error) {
        protocolError = error instanceof Error ? error.message : String(error);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      lines.close();
      callbacks.signal?.removeEventListener("abort", cancel);
      const cancelled = callbacks.signal?.aborted || code === 130;
      resolve(
        files.map(
          (input, index) =>
            results.get(index) || {
              status: cancelled ? "cancelled" : "failed",
              input,
              message: cancelled
                ? "Conversion cancelled."
                : stderr.trim() ||
                  protocolError ||
                  `Convt exited ${code ?? "unexpectedly"} without reporting an output. Check the output folder before retrying.`,
            },
        ),
      );
    });
  });
}
