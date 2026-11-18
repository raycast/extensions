import { BttError } from "bettertouchtool";

export function getBttErrorDetails(error: unknown): string | undefined {
  if (!(error instanceof BttError)) return undefined;

  const details: string[] = [];
  if (error.command) details.push(`Command: ${error.command}`);

  const cause = getCauseMessage(error.cause);
  if (cause && cause !== error.message) details.push(`Cause: ${cause}`);

  return details.length > 0 ? details.join(" · ") : undefined;
}

function getCauseMessage(cause: unknown): string | undefined {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return undefined;
}
