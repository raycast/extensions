import { Clipboard, LaunchProps, Toast, getSelectedText, showToast } from "@raycast/api";
import noteTool from "./tools/note";
import { formatErrorMessage } from "./utils/ui-helpers";

type QuickNoteLaunchContext = {
  selectedText?: string;
  text?: string;
  content?: string;
  applicationName?: string;
  applicationIdentifier?: string;
};

export default async function QuickNoteCommand({
  launchContext,
}: LaunchProps<{ arguments: Arguments.QuickNote; launchContext?: QuickNoteLaunchContext }>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving quick note",
    message: "Capturing selected text…",
  });

  try {
    const { content, sourceName } = await resolveContent(launchContext);
    const title = deriveTitle(content, launchContext ?? {});

    console.log("[quick-note] Captured note content", {
      characterCount: content.length,
      sourceName,
    });

    const result = await noteTool({ title, content });

    if (!result.success) {
      throw new Error(result.error ?? "Failed to upload note.");
    }

    toast.style = Toast.Style.Success;
    toast.title = "Note saved";
    toast.message = result.title || title;

    console.log("[quick-note] Note stored", {
      noteId: result.noteId,
      title: result.title,
      size: result.size,
    });
  } catch (error) {
    const message = formatErrorMessage(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Quick note failed";
    toast.message = message;
    console.error("[quick-note] Failed to save note", error);
  }
}

async function resolveContent(context?: QuickNoteLaunchContext): Promise<{ content: string; sourceName?: string }> {
  const contextText = chooseText([context?.selectedText, context?.text, context?.content]);
  if (contextText) {
    return { content: contextText, sourceName: context?.applicationName ?? context?.applicationIdentifier };
  }

  const selectedText = await getSelectedTextSafe();
  if (selectedText) {
    return { content: selectedText };
  }

  const clipboardText = await readClipboardText();
  if (clipboardText) {
    return { content: clipboardText, sourceName: "Clipboard" };
  }

  throw new Error("Select text or copy something to the clipboard before running Quick Note.");
}

function deriveTitle(content: string, context: QuickNoteLaunchContext): string {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const baseTitle = firstLine ? truncate(firstLine, 80) : "Quick Note";
  const source = context.applicationName?.trim();

  if (source) {
    return truncate(`${source}: ${baseTitle}`, 80);
  }

  return baseTitle;
}

function chooseText(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

async function getSelectedTextSafe(): Promise<string | undefined> {
  try {
    const text = await getSelectedText();
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch (error) {
    // Raycast throws when no text is selected; log for debugging and continue.
    console.warn("[quick-note] Unable to read selected text", error);
    return undefined;
  }
}

async function readClipboardText(): Promise<string | undefined> {
  try {
    const clipboard = await Clipboard.readText();
    const trimmed = clipboard?.trim();
    return trimmed ? trimmed : undefined;
  } catch (error) {
    console.warn("[quick-note] Unable to read clipboard text", error);
    return undefined;
  }
}

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1)}…`;
}
