export interface RunCommandLaunchContext {
  commandId: string;
}

export type InputSource = "selection" | "clipboard";

export interface RunInput {
  text: string;
  source: InputSource;
}

export interface RunViewLaunchContext {
  commandId: string;
  input?: RunInput;
}

export interface ChatSeed {
  userMessage: string;
  assistantMessage: string;
}

export interface ChatLaunchContext {
  seed?: ChatSeed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRunInput(value: unknown): value is RunInput {
  return (
    isRecord(value) && typeof value.text === "string" && (value.source === "selection" || value.source === "clipboard")
  );
}

function isChatSeed(value: unknown): value is ChatSeed {
  return isRecord(value) && typeof value.userMessage === "string" && typeof value.assistantMessage === "string";
}

export function isRunCommandLaunchContext(value: unknown): value is RunCommandLaunchContext {
  return isRecord(value) && isNonEmptyString(value.commandId);
}

export function isRunViewLaunchContext(value: unknown): value is RunViewLaunchContext {
  return isRecord(value) && isNonEmptyString(value.commandId) && (value.input === undefined || isRunInput(value.input));
}

export function isChatLaunchContext(value: unknown): value is ChatLaunchContext {
  return isRecord(value) && (value.seed === undefined || isChatSeed(value.seed));
}
