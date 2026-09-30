import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

type ErrorEnvelope = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type CLIEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export type CaptureDTO = {
  id: string;
  content: string;
  urls: string[];
  creationDate: string;
  editDate?: string;
  isArchived: boolean;
  listName?: string;
  attachmentCount: number;
  deepLinkURL: string;
};

export type CaptureListDTO = {
  id: string;
  name: string;
  creationDate: string;
  orderIndex?: number;
};

export class CaptureCLIError extends Error {
  code: string;
  exitCode?: number;
  stderr?: string;

  constructor(
    message: string,
    code: string,
    exitCode?: number,
    stderr?: string,
  ) {
    super(message);
    this.name = "CaptureCLIError";
    this.code = code;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export async function addCapture(
  content: string,
  listName?: string,
  attachmentPath?: string,
): Promise<CaptureDTO> {
  const args = ["add", "--content", content];
  if (listName) {
    args.push("--list", listName);
  }
  if (attachmentPath) {
    args.push("--attachment", attachmentPath);
  }
  return runCaptureCLI<CaptureDTO>(args);
}

export async function listCaptures(
  query: string,
  limit = 50,
  listName?: string,
  includeArchived = false,
): Promise<CaptureDTO[]> {
  const args = ["list", "--limit", String(limit)];
  if (query.trim()) {
    args.push("--query", query.trim());
  }
  if (listName) {
    args.push("--list", listName);
  }
  if (includeArchived) {
    args.push("--include-archived");
  }
  return runCaptureCLI<CaptureDTO[]>(args);
}

export async function getCapture(id: string): Promise<CaptureDTO> {
  return runCaptureCLI<CaptureDTO>(["get", "--id", id]);
}

export async function updateCapture(
  id: string,
  updates: { content?: string; list?: string; clearList?: boolean },
): Promise<CaptureDTO> {
  const args = ["update", "--id", id];
  if (updates.content !== undefined) {
    args.push("--content", updates.content);
  }
  if (updates.list) {
    args.push("--list", updates.list);
  }
  if (updates.clearList) {
    args.push("--clear-list");
  }
  return runCaptureCLI<CaptureDTO>(args);
}

export async function archiveCapture(
  id: string,
  unarchive = false,
): Promise<CaptureDTO> {
  const args = ["archive", "--id", id];
  if (unarchive) {
    args.push("--unarchive");
  }
  return runCaptureCLI<CaptureDTO>(args);
}

export async function deleteCapture(
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  return runCaptureCLI<{ id: string; deleted: boolean }>([
    "delete",
    "--id",
    id,
  ]);
}

export async function createList(name: string): Promise<CaptureListDTO> {
  return runCaptureCLI<CaptureListDTO>(["add-list", "--name", name]);
}

export async function listCaptureLists(
  query?: string,
): Promise<CaptureListDTO[]> {
  const args = ["lists"];
  if (query?.trim()) {
    args.push("--query", query.trim());
  }
  return runCaptureCLI<CaptureListDTO[]>(args);
}

export async function openCapture(id: string): Promise<void> {
  await runCaptureCLI<{ id: string; deepLinkURL: string }>([
    "open",
    "--id",
    id,
  ]);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runCaptureCLI<T>(args: string[]): Promise<T> {
  const { cliPath } = getPreferenceValues<Preferences>();

  try {
    const { stdout } = await execFileAsync(cliPath, args, {
      maxBuffer: 1024 * 1024,
    });
    return parseEnvelope<T>(stdout);
  } catch (error) {
    const processError = error as Error & {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    if (processError.stdout?.trim()) {
      return parseEnvelope<T>(
        processError.stdout,
        processError.code,
        processError.stderr,
      );
    }

    throw new CaptureCLIError(
      processError.message || "Failed to run capture-cli.",
      "processFailed",
      processError.code,
      processError.stderr,
    );
  }
}

function parseEnvelope<T>(
  stdout: string,
  exitCode?: number,
  stderr?: string,
): T {
  let envelope: CLIEnvelope<T>;
  try {
    envelope = JSON.parse(stdout) as CLIEnvelope<T>;
  } catch {
    throw new CaptureCLIError(
      "capture-cli returned invalid JSON.",
      "invalidJSON",
      exitCode,
      stderr,
    );
  }

  if (envelope.ok) {
    return envelope.data;
  }

  throw new CaptureCLIError(
    envelope.error.message,
    envelope.error.code,
    exitCode,
    stderr,
  );
}
