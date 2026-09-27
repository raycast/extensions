import { isAbsolute } from "node:path";
import { openWorktodoAtPath } from "../src/shared/application/worktodo";
import type { CreateServerOptions } from "./create-server";

export const WORKTODO_DATABASE_PATH_ENV = "WORKTODO_DATABASE_PATH";

export function createServerOptionsFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CreateServerOptions {
  const databasePath = environment[WORKTODO_DATABASE_PATH_ENV];
  if (databasePath === undefined) {
    return {};
  }
  if (!isAbsolute(databasePath)) {
    throw new Error(`${WORKTODO_DATABASE_PATH_ENV} must be an absolute path`);
  }
  return { openSession: () => openWorktodoAtPath(databasePath) };
}
