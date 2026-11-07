import { Clipboard, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runNative } from "./native";
import { parseWindowReply, SourceText } from "./protocol";

export async function openTranslationWindow(
  input: SourceText,
  options: { source: string; target: string; paired: boolean },
) {
  try {
    await closeMainWindow();
    const reply = parseWindowReply(
      await runNative("showWindow", { ...input, ...options }),
    );
    if (reply)
      await Clipboard.paste(
        reply.html ? { text: reply.text, html: reply.html } : reply.text,
      );
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Open Translation Window",
    });
  }
}
