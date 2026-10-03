import { List } from "@raycast/api";
import { PhotoshopFile, ViewMode } from "../types";
import { formatRelativeDate } from "../utils/format";
import { PhotoshopActionPanel } from "./PhotoshopActionPanel";

interface ProjectListItemProps {
  file: PhotoshopFile;
  thumbnailPath?: string;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
}

export function ProjectListItem({ file, thumbnailPath, viewMode, onToggleViewMode, onRefresh }: ProjectListItemProps) {
  const relativeDate = formatRelativeDate(file.lastOpenedDate || file.lastModifiedDate);

  const previewMarkdown = thumbnailPath
    ? `![${file.title}](${encodeURI(`file://${thumbnailPath}`)})`
    : `### ${file.title}\n\n*${file.extension.toUpperCase()} Document*`;

  return (
    <List.Item
      id={file.id}
      icon={{ fileIcon: file.path }}
      title={file.title}
      subtitle={file.directoryName}
      accessories={[{ text: file.formattedSize }, { text: relativeDate }]}
      quickLook={{
        path: thumbnailPath || file.path,
        name: file.name,
      }}
      detail={
        <List.Item.Detail
          markdown={previewMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Document" text={file.name} />
              <List.Item.Detail.Metadata.Label title="Format" text={file.extension.toUpperCase()} />
              <List.Item.Detail.Metadata.Label title="File Size" text={file.formattedSize} />
              {file.dimensions && (
                <List.Item.Detail.Metadata.Label
                  title="Dimensions"
                  text={`${file.dimensions.width} × ${file.dimensions.height} px`}
                />
              )}
              {file.dimensions?.dpi && (
                <List.Item.Detail.Metadata.Label title="Resolution" text={`${file.dimensions.dpi} DPI`} />
              )}
              {file.colorSpace && <List.Item.Detail.Metadata.Label title="Color Mode" text={file.colorSpace} />}
              {file.lastOpenedDate && (
                <List.Item.Detail.Metadata.Label
                  title="Last Opened in PS"
                  text={formatRelativeDate(file.lastOpenedDate)}
                />
              )}
              <List.Item.Detail.Metadata.Label title="Modified" text={formatRelativeDate(file.lastModifiedDate)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Path" text={file.directory} />

              {file.layers && file.layers.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Layers">
                  {file.layers.slice(0, 8).map((layer, idx) => (
                    <List.Item.Detail.Metadata.TagList.Item key={`${layer}-${idx}`} text={layer} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <PhotoshopActionPanel
          file={file}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
