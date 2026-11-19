import type { Image } from "@raycast/api";
import type { IndexedAttachment } from "@type/attachments";
import type { WorkspaceAttachmentsSection } from "../hooks/use-attachments";

export type AttachmentLayout = "grid" | "list";

export type AttachmentViewProps = {
  extensions: string[];
  selectedExtension: string;
  onExtensionChange: (extension: string) => void;
  sections: WorkspaceAttachmentsSection[];
  grouped: boolean;
  showWorkspaceAttachmentCount: boolean;
  isLoading: boolean;
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
  onRefresh: () => void;
  onViewChange: (layout: AttachmentLayout) => void;
};

const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "heic"]);

export function attachmentPreview(file: IndexedAttachment): Image.ImageLike {
  return imageExtensions.has(file.extension) ? file.path : { fileIcon: file.path };
}
