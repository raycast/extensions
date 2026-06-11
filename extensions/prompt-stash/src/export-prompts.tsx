import { LocalStorage, Toast, showInFinder, showToast } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { Prompt } from "./types";
import { PROMPTS_KEY, buildExport } from "./utils/transfer";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Exporting prompts…" });

  try {
    const stored = await LocalStorage.getItem<string>(PROMPTS_KEY);
    const prompts: Prompt[] = stored ? JSON.parse(stored) : [];

    if (prompts.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No prompts to export" });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `prompt-stash-${timestamp}.json`;
    const filepath = join(homedir(), "Downloads", filename);

    await writeFile(filepath, JSON.stringify(buildExport(prompts), null, 2), "utf-8");

    await showToast({
      style: Toast.Style.Success,
      title: `Exported ${prompts.length} prompt${prompts.length === 1 ? "" : "s"}`,
      message: filename,
      primaryAction: {
        title: "Show in Finder",
        onAction: () => showInFinder(filepath),
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
