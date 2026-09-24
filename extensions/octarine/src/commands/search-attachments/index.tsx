import type { ComponentType } from "react";
import { useState } from "react";
import { useAttachments } from "./hooks/use-attachments";
import { useWorkspaces } from "@hooks/use-workspaces";
import { searchAttachmentsPreferences } from "@lib/preferences";
import { ALL_EXTENSIONS } from "@type/attachments";
import { AttachmentsGridView } from "./components/grid";
import { AttachmentsListView } from "./components/list";
import type { AttachmentLayout, AttachmentViewProps } from "./components/view";

const attachmentViews = {
  grid: AttachmentsGridView,
  list: AttachmentsListView,
} satisfies Record<AttachmentLayout, ComponentType<AttachmentViewProps>>;

export default function SearchAttachmentsCommand() {
  const preferences = searchAttachmentsPreferences();
  const [layout, setLayout] = useState<AttachmentLayout>(preferences.listViewByDefault ? "list" : "grid");
  const [selectedExtension, setSelectedExtension] = useState(ALL_EXTENSIONS);
  const [searchText, setSearchText] = useState("");
  const [refresh, setRefresh] = useState(false);
  const {
    workspaces,
    status: { isLoading: isWorkspacesLoading },
    revalidate: revalidateWorkspaces,
  } = useWorkspaces({ refresh });
  const {
    dropdown: extensions,
    sections,
    isLoading,
    revalidate,
  } = useAttachments({
    workspaces,
    enabled: !isWorkspacesLoading,
    excludedExtensions: preferences.excludedExtensions,
    searchText,
    selectedExtension,
    refresh,
  });
  const View = attachmentViews[layout];
  const grouped = selectedExtension === ALL_EXTENSIONS && !preferences.flattenWorkspaceSections;
  const onRefresh = () => {
    if (refresh) {
      void revalidateWorkspaces();
      revalidate();
    } else {
      setRefresh(true);
    }
  };

  return (
    <View
      extensions={extensions}
      selectedExtension={selectedExtension}
      onExtensionChange={setSelectedExtension}
      sections={sections}
      grouped={grouped}
      showWorkspaceAttachmentCount={preferences.showWorkspaceAttachmentCount}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onRefresh={onRefresh}
      onViewChange={setLayout}
    />
  );
}
