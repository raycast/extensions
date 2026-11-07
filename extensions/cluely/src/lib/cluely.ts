import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
export const CLI_DOCS = "https://github.com/cluely/cluely-cli";
export const CLUELY_DASHBOARD = "https://v2.cluely.com";
export const INSTALL_COMMAND = "brew tap cluely/tap && brew install cluely";
export type SessionState = "" | "ongoing" | "analyzing" | "finished";
export type Since = "" | "24h" | "7d" | "30d";
export type Tag = { id: string; name: string; color?: string };
export type Meeting = {
  id: string;
  title: string;
  state: string;
  createdAt: string;
  endedAt?: string;
  tags: Tag[];
};
export type SessionPage = {
  items: Meeting[];
  nextCursor?: string;
  total?: number;
};
export type TranscriptEntry = {
  role: string;
  text: string;
  relativeMs?: number;
};
export type MeetingDetail = Meeting & {
  summary: string;
  transcript: TranscriptEntry[];
  attendees: string[];
};
export class CluelyError extends Error {
  constructor(
    public readonly kind:
      "missing-cli" | "signed-out" | "connection" | "response",
    message: string,
  ) {
    super(message);
    this.name = "CluelyError";
  }
}

type Dict = Record<string, unknown>;
function object(value: unknown): Dict {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CluelyError(
      "response",
      "Cluely returned an unexpected response. Update the official CLI and try again.",
    );
  return value as Dict;
}
function meeting(value: unknown): Meeting {
  const data = object(value);
  if (
    typeof data.id !== "string" ||
    !data.id ||
    typeof data.createdAt !== "string"
  )
    throw new CluelyError(
      "response",
      "A meeting response is missing required fields. Update the official CLI and try again.",
    );
  return {
    id: data.id,
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : "Untitled meeting",
    state: typeof data.state === "string" ? data.state : "unknown",
    createdAt: data.createdAt,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const tag = value as Dict;
          return typeof tag.id === "string" && typeof tag.name === "string"
            ? [
                {
                  id: tag.id,
                  name: tag.name,
                  color: typeof tag.color === "string" ? tag.color : undefined,
                },
              ]
            : [];
        })
      : [],
  };
}
export function parsePage(value: unknown): SessionPage {
  const data = object(value);
  if (
    !Array.isArray(data.items) ||
    (data.nextCursor != null && typeof data.nextCursor !== "string")
  )
    throw new CluelyError(
      "response",
      "Cluely returned an unexpected meeting list. Update the official CLI and try again.",
    );
  return {
    items: data.items.map(meeting),
    nextCursor:
      typeof data.nextCursor === "string" && data.nextCursor
        ? data.nextCursor
        : undefined,
    total: typeof data.total === "number" ? data.total : undefined,
  };
}
export function parseDetail(
  value: unknown,
  requestedId: string,
): MeetingDetail {
  const data = object(value);
  const item = meeting(data);
  if (item.id !== requestedId)
    throw new CluelyError(
      "response",
      "Cluely returned a different meeting than requested. Refresh the meeting list.",
    );
  return {
    ...item,
    summary: typeof data.summary === "string" ? data.summary : "",
    attendees: Array.isArray(data.attendees)
      ? data.attendees.flatMap((value) =>
          value &&
          typeof value === "object" &&
          typeof (value as Dict).email === "string"
            ? [(value as Dict).email as string]
            : [],
        )
      : [],
    transcript: Array.isArray(data.transcript)
      ? data.transcript.flatMap((value) => {
          if (
            !value ||
            typeof value !== "object" ||
            typeof (value as Dict).text !== "string"
          )
            return [];
          const entry = value as Dict;
          return [
            {
              role: typeof entry.role === "string" ? entry.role : "Speaker",
              text: entry.text as string,
              relativeMs:
                typeof entry.relativeMs === "number" &&
                Number.isFinite(entry.relativeMs)
                  ? entry.relativeMs
                  : undefined,
            },
          ];
        })
      : [],
  };
}
export function listArguments(filters: {
  state?: SessionState;
  since?: Since;
  cursor?: string;
}): string[] {
  const args = ["sessions", "list", "--json", "--limit", "50"];
  if (filters.state) {
    if (!["ongoing", "analyzing", "finished"].includes(filters.state))
      throw new CluelyError("response", "Choose a supported meeting state.");
    args.push("--state", filters.state);
  }
  if (filters.since) {
    if (!["24h", "7d", "30d"].includes(filters.since))
      throw new CluelyError("response", "Choose a supported date range.");
    args.push("--since", filters.since);
  }
  if (filters.cursor) args.push("--cursor", filters.cursor);
  return args;
}
export async function findCli(preferred?: string): Promise<string> {
  const custom = preferred?.trim();
  if (custom && !isAbsolute(custom))
    throw new CluelyError(
      "missing-cli",
      "Set Cluely CLI Path to an absolute executable path in extension preferences.",
    );
  const candidates = custom
    ? [custom]
    : [
        "/opt/homebrew/bin/cluely",
        "/usr/local/bin/cluely",
        join(homedir(), ".local/bin/cluely"),
      ];
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      if ((await stat(path)).isFile()) return path;
    } catch {
      /* Check the next conventional installation location. */
    }
  }
  throw new CluelyError(
    "missing-cli",
    custom
      ? "Cluely CLI Path does not point to an executable file. Check extension preferences."
      : "Install the official Cluely CLI, then sign in with ‘cluely auth login’. A custom installation path can be set in extension preferences.",
  );
}
export async function runCli(
  path: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  try {
    const { stdout } = await execute(path, args, {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
      signal,
    });
    return stdout;
  } catch (error) {
    const err = error as Error & {
      stdout?: string;
      stderr?: string;
      code?: string;
      killed?: boolean;
    };
    if (err.name === "AbortError") throw error;
    const diagnostic = `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    if (
      /not logged in|session expired|failed to read credentials|load token/i.test(
        diagnostic,
      )
    )
      throw new CluelyError(
        "signed-out",
        "Sign in to the official CLI with ‘cluely auth login’, then refresh. macOS may also ask for Keychain access.",
      );
    if (err.code === "ENOENT" || err.code === "EACCES")
      throw new CluelyError(
        "missing-cli",
        "The Cluely CLI could not be started. Check its installation path and executable permissions.",
      );
    if (err.killed)
      throw new CluelyError(
        "connection",
        "Cluely did not respond within 30 seconds. Check your connection and refresh.",
      );
    if (err.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER")
      throw new CluelyError(
        "response",
        "This meeting exceeds the supported response size. View it in the Cluely dashboard.",
      );
    throw new CluelyError(
      "connection",
      "The official Cluely CLI could not complete this read. Check your connection or update the CLI, then refresh.",
    );
  }
}
async function jsonRead(
  path: string,
  args: string[],
  signal?: AbortSignal,
): Promise<unknown> {
  const output = await runCli(path, args, signal);
  try {
    return JSON.parse(output);
  } catch {
    throw new CluelyError(
      "response",
      "Cluely did not return valid JSON. Update the official CLI and try again.",
    );
  }
}
export async function loadMeetings(
  path: string,
  filters: { state?: SessionState; since?: Since; cursor?: string },
  signal?: AbortSignal,
): Promise<SessionPage> {
  return parsePage(await jsonRead(path, listArguments(filters), signal));
}
export async function loadMeeting(
  path: string,
  id: string,
  signal?: AbortSignal,
): Promise<MeetingDetail> {
  if (!id || id.startsWith("-") || id.includes("\0"))
    throw new CluelyError(
      "response",
      "This meeting has an unsupported ID. Refresh the meeting list.",
    );
  return parseDetail(
    await jsonRead(path, ["sessions", "get", id, "--json"], signal),
    id,
  );
}
export function mergeMeetings(
  existing: Meeting[],
  incoming: Meeting[],
): Meeting[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}
export function filterMeetings(items: Meeting[], query: string): Meeting[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    words.every((word) =>
      `${item.title} ${item.tags.map((tag) => tag.name).join(" ")}`
        .toLocaleLowerCase()
        .includes(word),
    ),
  );
}
export function transcriptText(entries: TranscriptEntry[]): string {
  return entries
    .map((entry) => {
      const seconds =
        entry.relativeMs === undefined
          ? undefined
          : Math.floor(Math.max(0, entry.relativeMs) / 1000);
      const time =
        seconds === undefined
          ? ""
          : `[${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}] `;
      return `${time}${entry.role}: ${entry.text}`;
    })
    .join("\n\n");
}
export function readableError(error: unknown): string {
  return error instanceof CluelyError
    ? error.message
    : "This read could not complete. Refresh and try again.";
}
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
