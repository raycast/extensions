import { Clipboard, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { copyError } from "./copy-error";

// User and error text shows literally; only model output renders as Markdown.
export const escapeMarkdown = (text: string) => text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&");

// Raycast has no save dialog, so the file goes to ~/Downloads under a name that never overwrites:
// "name.md", then "name 2.md", as the Finder does. `what` names it in the toasts: "model card".
export async function saveMarkdownToDownloads(base: string, text: string, what: string) {
  const downloads = join(homedir(), "Downloads");
  try {
    await mkdir(downloads, { recursive: true });
    let path = join(downloads, `${base}.md`);
    for (let n = 2; ; n++) {
      try {
        await writeFile(path, text, { flag: "wx" });
        break;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
        path = join(downloads, `${base} ${n}.md`);
      }
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Saved ${what}`,
      message: path.replace(homedir(), "~"),
      primaryAction: {
        title: "Show in Finder",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => showInFinder(path),
      },
      secondaryAction: {
        title: "Copy Path",
        shortcut: { modifiers: ["cmd"], key: "c" },
        onAction: async (toast) => {
          await Clipboard.copy(path);
          toast.message = "Path copied to clipboard";
        },
      },
    });
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't save the ${what}`, primaryAction: copyError(error) });
  }
}
