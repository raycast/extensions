import { createSession, type TaskSession } from "./timer";

type Input = { task?: string; minutes?: string } | undefined;

export function resolveTaskLaunch(current: TaskSession | undefined, input: Input) {
  if (!input?.task && !input?.minutes) {
    return { session: current, created: false };
  }
  // Validate before changing any saved state.
  const candidate = createSession(input?.task ?? "", input?.minutes ?? "");
  if (current?.status === "running" || current?.status === "paused") {
    return {
      session: current,
      created: false,
      message: `A task is already active: ${current.taskName}. Finish it from the menu bar before starting another.`,
    };
  }
  return { session: candidate, created: true };
}
