import { Clipboard } from "@raycast/api";
import type { AiCommand } from "../lib/commands/types";
import { FmError } from "../lib/fm/errors";
import { respond } from "../lib/fm/client";
import type { RunInput } from "../lib/launch-context";
import { measureBudget } from "../lib/measure-budget";
import { parsePrompt } from "../lib/placeholders";
import { buildRunRequest } from "../lib/run-request";
import { commandInputLimit } from "../lib/tokens";
import { getSettings } from "./settings";

export interface ExecuteRunParams {
  command: AiCommand;
  input: RunInput;
  argumentValues: Record<string, string>;
  stream: boolean;
  signal?: AbortSignal;
  onText?: (accumulated: string) => void;
}

export async function executeRun(params: ExecuteRunParams): Promise<string> {
  const { command, input, argumentValues, stream, signal, onText } = params;
  const { timeoutMs } = getSettings();
  const clipboardText = parsePrompt(command.prompt).usesClipboard ? await Clipboard.readText() : undefined;

  const request = buildRunRequest({
    command,
    input,
    clipboardText,
    argumentValues,
    now: new Date(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    stream,
  });

  const check = await measureBudget({
    instructions: request.options.instructions ?? "",
    stdin: request.stdin,
    limitFor: commandInputLimit,
    timeoutMs,
    signal,
  });
  if (!check.ok) throw new FmError("contextOverflow", check.message);

  return respond(request.stdin, { ...request.options, timeoutMs, signal, onText });
}
