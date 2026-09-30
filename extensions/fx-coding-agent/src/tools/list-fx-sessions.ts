import { FxSessionsResponse, defaultWorkingDirectory, getFxPreferences, parseSessions, runFxJson } from "../lib/fx";

type Input = {
  /** Workspace used as fx's current directory. Defaults to the configured workspace or home directory. */
  workspace?: string;
  /** Cursor returned by a previous call, for the next page. */
  cursor?: string;
  /** Sessions per page, from 1 to 100. Defaults to 50. */
  limit?: number;
  /** List sessions from every workspace. Defaults to true. */
  allWorkspaces?: boolean;
};

/** Lists saved fx sessions without starting or modifying an agent session. */
export default async function listFxSessions(input: Input) {
  const { fxPath, defaultWorkspace } = getFxPreferences();
  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }

  const args = ["sessions", "--json", "--limit", String(limit)];
  if (input.allWorkspaces !== false) args.push("--all");
  if (input.cursor?.trim()) args.push("--cursor", input.cursor.trim());
  const response = parseSessions(
    await runFxJson<FxSessionsResponse>(fxPath, args, {
      cwd: defaultWorkingDirectory(input.workspace || defaultWorkspace),
    }),
  );
  return response;
}
