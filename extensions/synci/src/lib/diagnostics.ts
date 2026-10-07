import { ENVIRONMENT } from "./config";
import { SignInRequiredError } from "./oauth-session";

export type FailureCode = "http" | "network" | "response";
export class SynciApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: FailureCode = "http",
  ) {
    super(message);
  }
}

/** Deliberately omit messages, stacks, URLs, response bodies, and user data. */
export function errorDiagnostics(
  error: unknown,
  runtime: { command: string; raycast: string; platform: string },
  now = new Date(),
) {
  const commands = [
    "search-transactions",
    "check-balances",
    "view-holdings",
    "recent-spending",
    "connection-status",
    "reconnect-synci",
    "menu-bar-balance",
  ];
  return [
    "Synci diagnostic report",
    `Time: ${now.toISOString()}`,
    `Environment: ${ENVIRONMENT}`,
    `Command: ${commands.includes(runtime.command) ? runtime.command : "unknown"}`,
    `Raycast: ${/^[\d.]+$/.test(runtime.raycast) ? runtime.raycast : "unknown"}`,
    `Platform: ${["darwin", "win32", "linux"].includes(runtime.platform) ? runtime.platform : "unknown"}`,
    `Failure: ${error instanceof SignInRequiredError ? "sign-in-required" : error instanceof SynciApiError && ["http", "network", "response"].includes(error.code) ? error.code : "unexpected"}`,
    ...(error instanceof SynciApiError && Number.isInteger(error.status) && error.status >= 100 && error.status <= 599
      ? [`HTTP status: ${error.status}`]
      : []),
    "Credentials, account identifiers, financial records, and raw error text are excluded.",
  ].join("\n");
}
