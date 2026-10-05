export type TaskSession = {
  taskName: string;
  durationMinutes: number;
  startedAt: number;
  endsAt: number;
  status: "running" | "paused" | "finished";
  totalPausedMs?: number;
  pausedAt?: number;
  pausedRemainingMs?: number;
};

export function createSession(task: string, minutes: string, now = Date.now()): TaskSession {
  const taskName = task.trim();
  const input = minutes.trim();
  if (!taskName) throw new Error("Task must not be empty.");
  if (!/^[0-9]+$/.test(input)) throw new Error("Minutes must be a positive whole number.");
  const durationMinutes = Number(input);
  const endsAt = now + durationMinutes * 60_000;
  if (
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    !Number.isSafeInteger(endsAt) ||
    endsAt > 8.64e15
  ) {
    throw new Error("Minutes must be a positive whole number within the supported range.");
  }
  return { taskName, durationMinutes, startedAt: now, endsAt, status: "running" };
}

export function normalizeSession(value: unknown, now = Date.now()): TaskSession {
  if (!value || typeof value !== "object") throw new Error("Invalid saved timer.");
  const session = value as TaskSession;
  const totalPausedMs = session.totalPausedMs ?? 0;
  if (
    typeof session.taskName !== "string" ||
    !session.taskName.trim() ||
    !Number.isSafeInteger(session.durationMinutes) ||
    session.durationMinutes <= 0 ||
    !Number.isSafeInteger(session.startedAt) ||
    !Number.isSafeInteger(session.endsAt) ||
    !Number.isSafeInteger(totalPausedMs) ||
    totalPausedMs < 0 ||
    session.endsAt !== session.startedAt + session.durationMinutes * 60_000 + totalPausedMs ||
    (session.status !== "running" && session.status !== "paused" && session.status !== "finished") ||
    (session.status === "paused" &&
      (!Number.isSafeInteger(session.pausedAt) ||
        !Number.isSafeInteger(session.pausedRemainingMs) ||
        (session.pausedRemainingMs ?? 0) <= 0 ||
        session.pausedRemainingMs !== session.endsAt - (session.pausedAt ?? 0)))
  ) {
    throw new Error("Invalid saved timer.");
  }
  return {
    ...session,
    status: session.status === "running" && session.endsAt <= now ? "finished" : session.status,
  };
}

export function remainingTime(session: TaskSession, now = Date.now()): string {
  const milliseconds = session.status === "paused" ? (session.pausedRemainingMs ?? 0) : session.endsAt - now;
  const seconds = session.status === "finished" ? 0 : Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function shortTaskName(name: string): string {
  const characters = Array.from(name);
  return characters.length > 20 ? `${characters.slice(0, 19).join("")}…` : name;
}
