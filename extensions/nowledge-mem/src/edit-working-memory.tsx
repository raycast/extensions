import { open, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export default async function EditWorkingMemory() {
  const filePath = join(homedir(), "ai-now", "memory.md");

  if (!existsSync(filePath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Working Memory Not Found",
      message:
        "Enable Background Intelligence in Nowledge Mem to generate your daily briefing.",
    });
    return;
  }

  await open(filePath);
}
