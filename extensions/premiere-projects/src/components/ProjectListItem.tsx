import { Color, Icon, List } from "@raycast/api";
import { generateProjectSvgThumbnail } from "../services/thumbnails";
import { PremiereFile, ViewMode } from "../types";
import { formatDate } from "../utils/format";
import { PremiereActionPanel } from "./PremiereActionPanel";

interface ProjectListItemProps {
  file: PremiereFile;
  thumbnailPath?: string;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (deletedPath: string) => void;
}

export function ProjectListItem({
  file,
  thumbnailPath,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onFileRenamed,
  onFileDeleted,
}: ProjectListItemProps) {
  const preview = thumbnailPath || generateProjectSvgThumbnail(file);

  return (
    <List.Item
      id={file.id}
      icon={{ source: Icon.Video, tintColor: Color.Purple }}
      title={file.title}
      subtitle={file.directoryName}
      accessories={[
        ...(file.isProductionProject ? [{ tag: { value: "Production", color: Color.Purple } }] : []),
        { text: file.formattedSize },
        { text: formatDate(file.lastModifiedDate) },
      ]}
      detail={
        <List.Item.Detail
          markdown={`![Project Preview](${preview})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Project Title" text={file.title} />
              <List.Item.Detail.Metadata.Label title="Filename" text={file.name} />
              <List.Item.Detail.Metadata.TagList title="Format">
                <List.Item.Detail.Metadata.TagList.Item text={`.${file.extension}`} color={Color.Purple} />
              </List.Item.Detail.Metadata.TagList>

              {file.version && <List.Item.Detail.Metadata.Label title="Schema Version" text={file.version} />}

              {file.dimensions && (
                <List.Item.Detail.Metadata.Label
                  title="Resolution"
                  text={`${file.dimensions.width} × ${file.dimensions.height} ${
                    file.dimensions.aspectRatio ? `(${file.dimensions.aspectRatio})` : ""
                  }`}
                />
              )}

              {file.frameRate && <List.Item.Detail.Metadata.Label title="Frame Rate" text={file.frameRate} />}

              {file.isProductionProject && (
                <List.Item.Detail.Metadata.Label
                  title="Production"
                  text={file.productionName || "Yes"}
                  icon={Icon.Folder}
                />
              )}

              {file.sequences && file.sequences.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Sequences">
                  {file.sequences.slice(0, 5).map((seq, idx) => (
                    <List.Item.Detail.Metadata.TagList.Item key={idx} text={seq} color={Color.Blue} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="File Size" text={file.formattedSize} />
              <List.Item.Detail.Metadata.Label title="Last Modified" text={file.lastModifiedDate.toLocaleString()} />
              {file.lastOpenedDate && (
                <List.Item.Detail.Metadata.Label title="Last Opened" text={file.lastOpenedDate.toLocaleString()} />
              )}
              <List.Item.Detail.Metadata.Label title="Location" text={file.directory} icon={Icon.Folder} />
            </List.Item.Detail.Metadata>
          }
        />
      }
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
