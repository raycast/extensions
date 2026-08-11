import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useMemo } from "react";
import { useDocument } from "../hooks/useDocuments";
import { getDocumentFilePath } from "../lib/storage";
import { SearchResults } from "./SearchResults";
import { DocumentForm } from "./DocumentForm";

interface Props {
  documentId: string;
  highlightLine?: number;
  highlightTerm?: string;
}

export function DocumentDetail({
  documentId,
  highlightLine,
  highlightTerm,
}: Props) {
  const { push } = useNavigation();
  const { document, content, isLoading } = useDocument(documentId);
  const prefs = getPreferenceValues<{
    syncFolder?: string;
    defaultEditor?: string;
  }>();

  const filePath = document ? getDocumentFilePath(document.filename) : "";

  const openCommand = useMemo(() => {
    if (prefs.defaultEditor) {
      return `open -a "${prefs.defaultEditor}" "${filePath}"`;
    }
    return `open "${filePath}"`;
  }, [prefs.defaultEditor, filePath]);

  // Process content to position at highlighted line and highlight search term
  const displayContent = useMemo(() => {
    if (!content) return "*Empty document*";

    const lines = content.split("\n");

    // If we have a highlight line, reorder content to start from that line
    if (highlightLine && highlightLine > 0 && highlightLine <= lines.length) {
      const contextLines = 2; // Show a couple lines before for context
      const startLine = Math.max(0, highlightLine - 1 - contextLines);

      // Build the reordered content
      const beforeSection =
        startLine > 0 ? `*... ${startLine} lines above ...*\n\n---\n\n` : "";

      let visibleContent = lines.slice(startLine).join("\n");

      // Highlight the search term if provided
      if (highlightTerm) {
        const escapedTerm = highlightTerm.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const regex = new RegExp(`(${escapedTerm})`, "gi");
        visibleContent = visibleContent.replace(regex, "**`$1`**");
      }

      return beforeSection + visibleContent;
    }

    // No highlight line, return content as-is (optionally with term highlighting)
    if (highlightTerm) {
      const escapedTerm = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedTerm})`, "gi");
      return content.replace(regex, "**`$1`**");
    }

    return content;
  }, [content, highlightLine, highlightTerm]);

  if (!document) {
    return <Detail isLoading={isLoading} markdown="Document not found" />;
  }

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Title" text={document.title} />
      {document.tags.length > 0 && (
        <Detail.Metadata.TagList title="Tags">
          {document.tags.map((tag) => (
            <Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      )}
      {document.shortcut && (
        <Detail.Metadata.Label
          title="Shortcut"
          text={`${document.shortcut}:`}
        />
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Updated"
        text={new Date(document.updatedAt).toLocaleDateString()}
      />
      <Detail.Metadata.Label
        title="Created"
        text={new Date(document.createdAt).toLocaleDateString()}
      />
    </Detail.Metadata>
  );

  const navigationTitle = highlightLine
    ? `${document.title} - Line ${highlightLine}`
    : document.title;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      markdown={displayContent}
      metadata={metadata}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Search">
            <Action
              title="Search in Document"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() =>
                push(
                  <SearchResults documentId={documentId} content={content} />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            <Action
              title="Open in Editor"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                const { exec } = await import("child_process");
                exec(openCommand);
              }}
            />
            <Action.Push
              title="Edit Document"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<DocumentForm document={document} content={content} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Entire Document"
              content={content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Document Title"
              content={document.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy File Path" content={filePath} />
          </ActionPanel.Section>
          <ActionPanel.Section title="File">
            <Action.ShowInFinder path={filePath} />
            <Action.OpenWith path={filePath} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
