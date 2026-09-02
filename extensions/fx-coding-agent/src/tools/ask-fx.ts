import { Action, Tool } from "@raycast/api";

import { FxAskResponse, defaultWorkingDirectory, getFxPreferences, runFxJson } from "../lib/fx";

type Input = {
  /** Exact task or question to delegate to fx. */
  prompt: string;
  /** Workspace directory fx may inspect and modify. Required unless a default workspace is configured. */
  workspace?: string;
  /** Existing session ID to continue. Obtain it from List Fx Sessions; omit to create a new session. */
  resumeSessionId?: string;
};

function normalizedInput(input: Input) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("prompt is required.");
  const { defaultWorkspace } = getFxPreferences();
  const workspace = input.workspace?.trim() || defaultWorkspace?.trim();
  if (!workspace) throw new Error("workspace is required when no default workspace is configured.");
  return { prompt, workspace, resumeSessionId: input.resumeSessionId?.trim() || undefined };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const normalized = normalizedInput(input);
  return {
    style: Action.Style.Regular,
    message:
      "Allow fx to work on this request? fx may inspect or modify files within the workspace under its configured permission rules.",
    info: [
      { name: "Prompt", value: normalized.prompt },
      { name: "Workspace", value: normalized.workspace },
      { name: "Resume Session", value: normalized.resumeSessionId || "New session" },
    ],
  };
};

/** Delegates a noninteractive request to fx after confirmation, retaining fx's permission checks. */
export default async function askFx(input: Input) {
  const normalized = normalizedInput(input);
  const { fxPath } = getFxPreferences();
  const args = ["ask", "--json"];
  if (normalized.resumeSessionId) args.push("--resume", normalized.resumeSessionId);
  args.push(normalized.prompt);
  return runFxJson<FxAskResponse>(fxPath, args, {
    cwd: defaultWorkingDirectory(normalized.workspace),
    timeoutMs: 30 * 60 * 1000,
  });
}
