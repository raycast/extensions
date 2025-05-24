// src/components/ActionComponents.tsx
import { ActionPanel, Action, Icon } from "@raycast/api";

interface CommonActionsProps {
  showCreateFileForm: () => void;
  revalidate: () => void;
  showColorTags: boolean;
  setShowColorTags: (show: boolean) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  showTagSearchList: () => void;
}

// Removed loadMoreFiles from CommonActionsProps since it has its own component

export function CommonActions({
  showCreateFileForm,
  revalidate,
  showColorTags,
  setShowColorTags,
  selectedTag,
  setSelectedTag,
  showTagSearchList,
}: CommonActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Create New Markdown File" icon={Icon.NewDocument} onAction={showCreateFileForm} />
        <Action title="Refresh List" icon={Icon.RotateClockwise} onAction={revalidate} />
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
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// Create a separate interface for LoadMoreAction to avoid dependency on CommonActionsProps
interface LoadMoreActionProps {
  loadMoreFiles: () => void;
}

export function LoadMoreAction({ loadMoreFiles }: LoadMoreActionProps) {
  return (
    <ActionPanel>
      <Action title="Load More Files" icon={Icon.Plus} onAction={loadMoreFiles} />
    </ActionPanel>
  );
}
