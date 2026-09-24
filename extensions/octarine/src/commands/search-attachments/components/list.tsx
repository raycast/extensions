import { Icon, List } from "@raycast/api";
import type { IndexedAttachment } from "@type/attachments";
import { ALL_EXTENSIONS } from "@type/attachments";
import { AttachmentActions, EmptyAttachmentsActions, type AttachmentViewAction } from "./actions";
import { attachmentPreview, type AttachmentViewProps } from "./view";

export function AttachmentsListView({
  extensions,
  selectedExtension,
  onExtensionChange,
  sections,
  grouped,
  showWorkspaceAttachmentCount,
  isLoading,
  searchText,
  onSearchTextChange,
  onRefresh,
  onViewChange,
}: AttachmentViewProps) {
  const viewAction: AttachmentViewAction = {
    title: "Use Grid View",
    icon: Icon.AppWindowGrid2x2,
    onAction: () => onViewChange("grid"),
  };

  const renderAttachment = (file: IndexedAttachment) => (
    <List.Item
      key={file.path}
      title={file.name}
      subtitle={file.extension.toUpperCase()}
      icon={attachmentPreview(file)}
      quickLook={{ name: file.name, path: file.path }}
      keywords={[file.workspace.name, file.extension]}
      actions={<AttachmentActions file={file} onRefresh={onRefresh} viewAction={viewAction} />}
    />
  );

  const results = grouped
    ? sections.map((section) => (
        <List.Section
          key={section.workspace.path}
          title={`${section.workspace.display ?? section.workspace.name}${
            showWorkspaceAttachmentCount ? ` (${section.attachments.length})` : ""
          }`}
        >
          {section.attachments.map(renderAttachment)}
        </List.Section>
      ))
    : sections.flatMap((section) => section.attachments.map(renderAttachment));

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Search attachments"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by file extension" value={selectedExtension} onChange={onExtensionChange}>
          <List.Dropdown.Item title="All Extensions" value={ALL_EXTENSIONS} />
          {extensions.map((extension) => (
            <List.Dropdown.Item key={extension} title={extension.toUpperCase()} value={extension} />
          ))}
        </List.Dropdown>
      }
    >
      {extensions.length === 0 ? (
        <List.EmptyView
          icon={Icon.Paperclip}
          title="No Attachments Found"
          description="Attach a file to any note in Octarine to see it here."
          actions={<EmptyAttachmentsActions onRefresh={onRefresh} viewAction={viewAction} />}
        />
      ) : sections.length === 0 ? (
        <List.EmptyView
          title="No attachments found"
          description="Try a different search or filter"
          actions={<AttachmentActions onRefresh={onRefresh} viewAction={viewAction} />}
        />
      ) : (
        results
      )}
    </List>
  );
}
