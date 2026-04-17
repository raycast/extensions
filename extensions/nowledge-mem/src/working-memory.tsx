import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getConnectionConfig, readWorkingMemory } from "./api";

export default function WorkingMemory() {
  const { isLoading, data } = useCachedPromise(readWorkingMemory);
  const { baseUrl, space } = getConnectionConfig();

  if (!data?.exists) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          isLoading
            ? "Loading Working Memory..."
            : `# Working Memory Not Available

Ensure Nowledge Mem is running and reachable from Raycast.

The Working Memory API is the source of truth for this command.`
        }
      />
    );
  }

  const content = data.content || "";
  const lineCount = content.split("\n").length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Connection"
            text={baseUrl}
            icon={Icon.Network}
          />
          {space && (
            <Detail.Metadata.Label
              title="Space"
              text={space}
              icon={Icon.Folder}
            />
          )}
          {data.date && (
            <Detail.Metadata.Label
              title="Date"
              text={data.date}
              icon={Icon.Calendar}
            />
          )}
          <Detail.Metadata.Label
            title="Size"
            text={`${wordCount} words · ${lineCount} lines`}
            icon={Icon.Document}
          />
          {data.file_path && (
            <Detail.Metadata.Label
              title="Source File"
              text={data.file_path}
              icon={Icon.Folder}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open in App"
            text="Nowledge Mem"
            target="nowledgemem://working-memory"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
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
