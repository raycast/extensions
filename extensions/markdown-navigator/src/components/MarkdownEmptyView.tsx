// src/components/MarkdownEmptyView.tsx
import { List } from "@raycast/api";

interface MarkdownEmptyViewProps {
  isLoading: boolean;
  error: Error | string | null;
  selectedTag: string | null;
  actions: JSX.Element;
}

export function MarkdownEmptyView({ isLoading, error, selectedTag, actions }: MarkdownEmptyViewProps) {
  return (
    <List.EmptyView
      title={
        isLoading
          ? "Scanning Markdown files..."
          : error
            ? "Error loading files"
            : selectedTag
              ? `No files with the tag #${selectedTag} were found`
              : "Markdown file not found"
      }
      description={
        isLoading
          ? "This may take a moment. Please wait..."
          : error
            ? error instanceof Error
              ? error.message
              : String(error)
            : selectedTag
              ? "Try choosing a different tag"
              : "Create a new Markdown file to get started or set a valid directory in preferences"
      }
      actions={actions}
    />
  );
}
