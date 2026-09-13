/**
 * None of these is ever swallowed. Showing an empty list would be the worst
 * outcome: "nothing waiting" and "couldn't look" become indistinguishable,
 * and the user reads the second as the first.
 */
export type AppErrorKind =
  | { type: "network"; detail: string }
  | { type: "notAuthenticated" }
  | { type: "graphQL"; message: string }
  | { type: "parse"; detail: string }
  | { type: "rateLimited"; resetAt: string }
  | { type: "allowListEmpty" }
  | { type: "filtersDropped" };

export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind) {
    super(kind.type);
    this.name = "AppError";
    this.kind = kind;
  }
}

/** One-line text for the menu row. */
export function errorText(kind: AppErrorKind, formatClock: (date: Date) => string): string {
  switch (kind.type) {
    case "notAuthenticated":
      return "Not signed in to GitHub";
    case "network":
      return "No connection";
    case "graphQL":
      return `GitHub error: ${kind.message}`;
    case "parse":
      return "Unexpected response from GitHub";
    case "rateLimited":
      return `Rate limit reached · resets ${formatClock(new Date(kind.resetAt))}`;
    case "allowListEmpty":
      return "No repositories selected";
    case "filtersDropped":
      return "Too many filters — some were dropped";
  }
}

export function toAppError(error: unknown): AppErrorKind {
  if (error instanceof AppError) return error.kind;
  if (error instanceof Error) return { type: "network", detail: error.message };
  return { type: "network", detail: String(error) };
}
