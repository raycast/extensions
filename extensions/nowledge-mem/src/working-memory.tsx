import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readWorkingMemory } from "./api";
import { homedir } from "os";
import { join } from "path";

const WM_PATH = join(homedir(), "ai-now", "memory.md");

export default function WorkingMemory() {
  const { isLoading, data: content } = useCachedPromise(readWorkingMemory);

  if (!content) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          isLoading
            ? "Loading Working Memory..."
            : "# Working Memory Not Available\n\nEnsure Nowledge Mem is running with Background Intelligence enabled.\n\nThe daily briefing is generated each morning and saved to `~/ai-now/memory.md`."
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.Open
            title="Edit in Default Editor"
            target={WM_PATH}
            icon={Icon.Pencil}
          />
          <Action.CopyToClipboard
            title="Copy Working Memory"
            content={content}
          />
          <Action.Open
            title="Open in Nowledge Mem"
            target="nowledgemem://working-memory"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
