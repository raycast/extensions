import { Grid } from "@raycast/api";
import { PhotoshopFile, ViewMode } from "../types";
import { formatDimensions, formatRelativeDate } from "../utils/format";
import { PhotoshopActionPanel } from "./PhotoshopActionPanel";

interface ProjectGridItemProps {
  file: PhotoshopFile;
  thumbnailPath?: string;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
  onRenamed?: (newPath: string) => void;
}

export function ProjectGridItem({
  file,
  thumbnailPath,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onRenamed,
}: ProjectGridItemProps) {
  const relativeDate = formatRelativeDate(file.lastOpenedDate || file.lastModifiedDate);
  const dimensionsStr = formatDimensions(file.dimensions);
  const subtitle = dimensionsStr
    ? `${file.directoryName} • ${dimensionsStr}`
    : `${file.directoryName} • ${relativeDate}`;

  return (
    <Grid.Item
      id={file.id}
      title={file.title}
      subtitle={subtitle}
      content={{ source: thumbnailPath || "extension-icon.png" }}
      quickLook={{
        path: file.path,
        name: file.name,
      }}
      actions={
        <PhotoshopActionPanel
          file={file}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          onRefresh={onRefresh}
          onRenamed={onRenamed}
        />
      }
    />
  );
}
