import { Color, Grid, Icon } from "@raycast/api";
import { generateProjectSvgThumbnail } from "../services/thumbnails";
import { PremiereFile, ViewMode } from "../types";
import { formatDate } from "../utils/format";
import { PremiereActionPanel } from "./PremiereActionPanel";

interface ProjectGridItemProps {
  file: PremiereFile;
  thumbnailPath?: string;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (deletedPath: string) => void;
}

export function ProjectGridItem({
  file,
  thumbnailPath,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onFileRenamed,
  onFileDeleted,
}: ProjectGridItemProps) {
  const previewContent = thumbnailPath || generateProjectSvgThumbnail(file);

  return (
    <Grid.Item
      id={file.id}
      content={previewContent}
      title={file.title}
      subtitle={`${file.formattedSize} • ${formatDate(file.lastModifiedDate)}`}
      accessory={
        file.isProductionProject
          ? {
              icon: { source: Icon.Folder, tintColor: Color.Purple },
              tooltip: `Production: ${file.productionName || "Yes"}`,
            }
          : undefined
      }
      quickLook={{
        path: thumbnailPath && !thumbnailPath.startsWith("data:") ? thumbnailPath : file.path,
        name: file.name,
      }}
      actions={
        <PremiereActionPanel
          file={file}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          onRefresh={onRefresh}
          onFileRenamed={onFileRenamed}
          onFileDeleted={onFileDeleted}
        />
      }
    />
  );
}
