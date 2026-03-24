import { cleanMermaidCode } from "./mermaid-code";

export type MermaidInputSource = "selected" | "clipboard";

export interface ResolvedMermaidInput {
  code: string;
  source: MermaidInputSource;
}

export class InputResolutionError extends Error {
  constructor(
    public readonly code: "NO_INPUT" | "INPUT_READ_FAILED",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InputResolutionError";
  }
}

interface ResolveMermaidInputOptions {
  getSelectedText: () => Promise<string>;
  getClipboardText: () => Promise<string | null>;
}

interface ResolveClipboardMermaidInputOptions {
  getClipboardText: () => Promise<string | null>;
}

function buildResolvedInput(rawText: string, source: MermaidInputSource): ResolvedMermaidInput {
  return {
    code: cleanMermaidCode(rawText),
    source,
  };
}

export function getInputResolutionErrorMessage(error: InputResolutionError) {
  return error.code === "NO_INPUT"
    ? "No selected text or clipboard content. Please select Mermaid code or copy it first."
    : "Failed to read selected text or clipboard.";
}

export async function resolveMermaidInput({
  getSelectedText,
  getClipboardText,
}: ResolveMermaidInputOptions): Promise<ResolvedMermaidInput> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim()) {
      return buildResolvedInput(selectedText, "selected");
    }
  } catch {
    // Selection access is optional; clipboard fallback handles unsupported apps.
  }

  return resolveClipboardMermaidInput({ getClipboardText });
}

export async function resolveClipboardMermaidInput({
  getClipboardText,
}: ResolveClipboardMermaidInputOptions): Promise<ResolvedMermaidInput> {
  try {
    const clipboardText = await getClipboardText();
    if (clipboardText?.trim()) {
      return buildResolvedInput(clipboardText, "clipboard");
    }
  } catch (error) {
    throw new InputResolutionError("INPUT_READ_FAILED", "Failed to read selected text or clipboard.", error);
  }

  throw new InputResolutionError("NO_INPUT", "Please select Mermaid code or copy it first.");
}
