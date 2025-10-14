import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PasteAction } from "../../components/paste-action";
import { Snippet } from "../../utils/claude-message";
import CreateSnippet from "../create-snippet/list";

interface SnippetDetailProps {
  snippet: Snippet;
  onDelete: (snippet: Snippet) => void;
}

export default function SnippetDetail({ snippet, onDelete }: SnippetDetailProps) {
  return (
    <Detail
      markdown={snippet.content}
      navigationTitle={snippet.title || "Untitled Snippet"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={snippet.title || "Untitled"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={snippet.createdAt.toLocaleString()} />
          <Detail.Metadata.Label title="Updated" text={snippet.updatedAt.toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PasteAction content={snippet.content} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={snippet.content}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.Push
            title="Duplicate Snippet"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={
              <CreateSnippet title={snippet.title ? `${snippet.title} (Copy)` : "Copy"} content={snippet.content} />
            }
          />
          <Action
            title="Delete Snippet"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => onDelete(snippet)}
          />
        </ActionPanel>
      }
    />
  );
}
