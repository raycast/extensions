import { resolveClipboardMermaidInput, resolveMermaidInput, type ResolvedMermaidInput } from "./mermaid-input";

type GetSelectedText = () => Promise<string>;
type GetClipboardText = () => Promise<string | null>;

interface ResolveManualInputOptions {
  getSelectedText: GetSelectedText;
  getClipboardText: GetClipboardText;
}

interface ResolveClipboardManualInputOptions {
  getClipboardText: GetClipboardText;
}

export async function resolveManualInput({
  getSelectedText,
  getClipboardText,
}: ResolveManualInputOptions): Promise<ResolvedMermaidInput> {
  return resolveMermaidInput({
    getSelectedText,
    getClipboardText,
  });
}

export async function resolveClipboardOnlyManualInput({
  getClipboardText,
}: ResolveClipboardManualInputOptions): Promise<ResolvedMermaidInput> {
  return resolveClipboardMermaidInput({
    getClipboardText,
  });
}
