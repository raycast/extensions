import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readWorkingMemory } from "./api";
import { homedir } from "os";
import { join } from "path";
import { statSync } from "fs";

const WM_PATH = join(homedir(), "ai-now", "memory.md");

function getFileModified(): string {
  try {
    const stats = statSync(WM_PATH);
    return stats.mtime.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

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

  const modified = getFileModified();
  const lineCount = content.split("\n").length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      metadata={
        <Detail.Metadata>
          {modified && (
            <Detail.Metadata.Label
              title="Last Updated"
              text={modified}
              icon={Icon.Clock}
            />
          )}
          <Detail.Metadata.Label
            title="Size"
            text={`${wordCount} words · ${lineCount} lines`}
            icon={Icon.Document}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Location"
            text="~/ai-now/memory.md"
            icon={Icon.Folder}
          />
          <Detail.Metadata.Link
            title="Open in App"
            text="Nowledge Mem"
            target="nowledgemem://working-memory"
          />
        </Detail.Metadata>
      }
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
