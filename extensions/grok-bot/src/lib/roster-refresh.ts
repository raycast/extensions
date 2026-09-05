import { Bot, GatewayError, Result } from "./types";

export function applyRosterRefresh(args: { committed: Bot[]; result: Result<Bot[], GatewayError> }): {
  committed: Bot[];
  error: GatewayError | null;
} {
  if (args.result.ok) {
    return { committed: args.result.value, error: null };
  }

  return { committed: args.committed, error: args.result.error };
}

export function visibleRoster(args: { committed: Bot[]; draft: Bot[] | null }): Bot[] {
  if (args.committed.length > 0) {
    return args.committed;
  }

  return args.draft ?? [];
}

export function isStaleRosterFailure(args: {
  error: GatewayError | null;
  committedCount: number;
}): args is { error: GatewayError; committedCount: number } {
  return args.error !== null && args.committedCount > 0;
}
