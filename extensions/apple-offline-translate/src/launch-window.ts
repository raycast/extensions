import {
  Clipboard,
  closeMainWindow,
  environment,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { parseWindowReply, SourceText } from "./protocol";

export async function openTranslationWindow(
  input: SourceText,
  options: { source: string; target: string; paired: boolean },
) {
  try {
    await closeMainWindow();
    const output = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        join(
          environment.assetsPath,
          "Apple Translate.app",
          "Contents",
          "MacOS",
          "AppleTranslate",
        ),
        [],
        { maxBuffer: 4_000_000 },
        (error, stdout) => {
          if (error)
            reject(new Error("Could not open the large translation window."));
          else resolve(stdout);
        },
      );
      child.stdin?.on("error", reject);
      child.stdin?.end(JSON.stringify({ ...input, ...options }));
    });
    const reply = parseWindowReply(output);
    if (reply)
      await Clipboard.paste(
        reply.html ? { text: reply.text, html: reply.html } : reply.text,
      );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Apple Translate",
      message:
        error instanceof Error
          ? error.message
          : "Could not open Apple Translate.",
    });
  }
}
