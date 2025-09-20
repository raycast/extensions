// src/components/PaginationSection.tsx
import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface PaginationSectionProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  revalidate: () => void;
  pageInfoText: string;
  loadMoreFiles: () => void;
  showTagSearchList: () => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  showColorTags: boolean;
  setShowColorTags: (show: boolean) => void;
}

export function PaginationSection({
  currentPage,
  totalPages,
  setCurrentPage,
  revalidate,
  pageInfoText,
  loadMoreFiles,
  showTagSearchList,
  selectedTag,
  setSelectedTag,
  showColorTags,
  setShowColorTags,
}: PaginationSectionProps) {
  return (
    <List.Section title={`Page ${currentPage + 1} of ${totalPages}`}>
      <List.Item
        title={pageInfoText}
        actions={
          <ActionPanel>
            <Action
              title="Browse Tags"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={showTagSearchList}
            />
            {selectedTag && (
              <Action
                title="Clear Tag Filter"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => setSelectedTag(null)}
              />
            )}
            <Action
              title={showColorTags ? "Hide Colored Tags" : "Show Colored Tags"}
              icon={showColorTags ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => setShowColorTags(!showColorTags)}
            />
            {currentPage > 0 && (
              <Action
                title="Previous Page"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={() => setCurrentPage(currentPage - 1)}
              />
            )}
            {currentPage < totalPages - 1 && (
              <Action
                title="Next Page"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => setCurrentPage(currentPage + 1)}
              />
            )}
            <Action
              title="Refresh List"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
            <Action
              title="Load More Files"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={loadMoreFiles}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
