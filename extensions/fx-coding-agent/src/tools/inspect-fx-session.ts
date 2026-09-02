import { defaultWorkingDirectory, FxSessionDetail, getFxPreferences, parseSessionDetail, runFxJson } from "../lib/fx";

type Input = {
  /** Exact session ID obtained from List Fx Sessions. */
  sessionId: string;
  /** Workspace used as fx's current directory. Defaults to the configured workspace or home directory. */
  workspace?: string;
};

/** Reads one saved fx session, including its metadata and conversation history. */
export default async function inspectFxSession(input: Input) {
  const sessionId = input.sessionId.trim();
  if (!sessionId) throw new Error("sessionId is required.");
  const { fxPath, defaultWorkspace } = getFxPreferences();
  return parseSessionDetail(
    await runFxJson<FxSessionDetail>(fxPath, ["session", "--id", sessionId, "--json"], {
      cwd: defaultWorkingDirectory(input.workspace || defaultWorkspace),
    }),
  );
}
