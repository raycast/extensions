import type { AiCommand } from "./commands/types";
import type { RespondOptions } from "./fm/args";
import type { RunInput } from "./launch-context";
import { CLIPBOARD_MARKER, parsePrompt, renderInstructions, SELECTION_MARKER } from "./placeholders";

export const REPLACE_OUTPUT_RULE =
  "Respond with only the resulting text. Do not add an introduction, explanation, quotes or notes.";
export const NO_INPUT_MESSAGE = "Select some text first";

export interface RunRequest {
  stdin: string;
  options: RespondOptions;
}

export type LaunchTarget = { kind: "none" } | { kind: "missing" } | { kind: "found"; command: AiCommand };

export function resolveInput(selection: string | undefined, clipboard: string | undefined): RunInput | undefined {
  if (selection?.trim()) return { text: selection, source: "selection" };
  if (clipboard?.trim()) return { text: clipboard, source: "clipboard" };
  return undefined;
}

export function buildRunRequest(params: {
  command: AiCommand;
  input: RunInput;
  clipboardText?: string;
  argumentValues: Record<string, string>;
  now: Date;
  locale?: string;
  stream: boolean;
}): RunRequest {
  const { command, input, clipboardText, argumentValues, now, locale, stream } = params;
  const usesClipboard = parsePrompt(command.prompt).usesClipboard;
  const extraClipboard = usesClipboard && input.source === "selection" && !!clipboardText?.trim();

  let clipboardReplacement = "";
  if (usesClipboard) {
    if (input.source === "clipboard") clipboardReplacement = SELECTION_MARKER;
    else if (extraClipboard) clipboardReplacement = CLIPBOARD_MARKER;
  }

  const rendered = renderInstructions(command.prompt, {
    argumentValues,
    now,
    locale,
    selectionReplacement: SELECTION_MARKER,
    clipboardReplacement,
  });
  const instructions = command.output === "replace" ? `${rendered}\n\n${REPLACE_OUTPUT_RULE}` : rendered;
  const stdin = extraClipboard ? `Text:\n${input.text}\n\nClipboard text:\n${clipboardText}` : input.text;

  return {
    stdin,
    options: {
      model: command.model,
      instructions,
      creativity: command.creativity,
      useCase: command.useCase,
      guardrails: command.guardrails,
      stream,
    },
  };
}

export function resolveLaunchTarget(commandId: string | undefined, commands: AiCommand[]): LaunchTarget {
  if (commandId === undefined) return { kind: "none" };
  const command = commands.find((candidate) => candidate.id === commandId);
  return command ? { kind: "found", command } : { kind: "missing" };
}
