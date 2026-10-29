import net from "net";
import os from "os";
import path from "path";

export const SOCKET_PATH = path.join(
  os.homedir(),
  "Library/Application Support/Dondori/raycast.sock",
);

const TIMEOUT_MS = 1500;

export interface Task {
  id: string;
  title: string;
  statusId: string;
  statusCategory: string;
  /** Present since app f1a21a6; absent in older builds. */
  statusName?: string | null;
  priority: number | null;
  source: string | null;
  identifier: string | null;
  trackedMin: number;
  timerRunning: boolean;
  /** Local civil datetime "YYYY-MM-DDTHH:MM", no timezone. End = start + durationMin. */
  scheduledAt: string | null;
  durationMin: number | null;
}

type Request =
  | { cmd: "today" }
  | { cmd: "toggle"; id: string }
  | { cmd: "start_timer"; id: string }
  | { cmd: "stop_timer" }
  | { cmd: "quick_add"; text: string };

export type OpenTarget = "panel" | "notes" | "calendar" | "pool" | "focus";

/** Socket is absent (app not running or Raycast integration disabled). */
export class SocketUnavailableError extends Error {
  constructor(cause?: string) {
    super(cause ?? "Dondori socket is unavailable");
    this.name = "SocketUnavailableError";
  }
}

/** App answered with {"ok":false,"error":…}. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** One command = one connection; the protocol is line-based JSON. */
function request(req: Request): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: SOCKET_PATH });
    let buffer = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.on("timeout", () =>
      finish(() => reject(new SocketUnavailableError("Request timed out"))),
    );
    socket.on("error", (err: NodeJS.ErrnoException) =>
      finish(() => reject(new SocketUnavailableError(err.message))),
    );
    socket.on("connect", () => socket.write(JSON.stringify(req) + "\n"));
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const nl = buffer.indexOf("\n");
      if (nl === -1) return;
      const line = buffer.slice(0, nl);
      finish(() => {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(line);
        } catch {
          reject(new AppError(`Malformed response: ${line.slice(0, 200)}`));
          return;
        }
        if (
          parsed.ok === false ||
          (typeof parsed.error === "string" && parsed.error)
        ) {
          reject(new AppError(String(parsed.error ?? "Unknown app error")));
          return;
        }
        resolve(parsed);
      });
    });
    socket.on("close", () =>
      finish(() =>
        reject(
          new SocketUnavailableError("Connection closed without response"),
        ),
      ),
    );
  });
}

/**
 * Build a Task from an untrusted socket payload: the identifying trio must be
 * strings, every other field is coerced to its expected type (or null) so a
 * stray value can never crash the render path.
 */
function toTask(value: unknown): Task | null {
  if (typeof value !== "object" || value === null) return null;
  const t = value as Record<string, unknown>;
  if (
    typeof t.id !== "string" ||
    typeof t.title !== "string" ||
    typeof t.statusCategory !== "string"
  ) {
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    id: t.id,
    title: t.title,
    statusId: str(t.statusId) ?? "",
    statusCategory: t.statusCategory,
    statusName: str(t.statusName),
    priority: num(t.priority),
    source: str(t.source),
    identifier: str(t.identifier),
    trackedMin: num(t.trackedMin) ?? 0,
    timerRunning: t.timerRunning === true,
    scheduledAt: str(t.scheduledAt),
    durationMin: num(t.durationMin),
  };
}

export async function fetchToday(): Promise<Task[]> {
  const res = await request({ cmd: "today" });
  const tasks = Array.isArray(res.tasks) ? res.tasks.map(toTask) : null;
  if (!tasks || tasks.some((t) => t === null)) {
    throw new AppError("Malformed response: invalid task list");
  }
  return tasks as Task[];
}

export async function toggleTask(id: string): Promise<void> {
  await request({ cmd: "toggle", id });
}

export async function startTimer(id: string): Promise<void> {
  await request({ cmd: "start_timer", id });
}

export async function stopTimer(): Promise<void> {
  await request({ cmd: "stop_timer" });
}

export async function quickAdd(text: string): Promise<string> {
  const res = await request({ cmd: "quick_add", text });
  if (typeof res.id !== "string" || res.id.length === 0) {
    throw new AppError("Malformed response: missing task id");
  }
  return res.id;
}
