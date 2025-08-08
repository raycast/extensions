import { List } from "@raycast/api";
import { getPreviewContent, getFileDetails, getCompactDate } from "./utils";

interface FileDetailProps {
  filePath: string;
}

export function FileDetail({ filePath }: FileDetailProps) {
  const details = getFileDetails(filePath);
  const previewContent = !details.error ? getPreviewContent(filePath, details.extension, details.isDirectory) : null;

  return (
    <List.Item.Detail
      {...(previewContent && { markdown: previewContent })}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={details.fileName} icon={{ fileIcon: filePath }} />

          {details.error ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Error" text={details.error} />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={`${details.fileType}${details.extension ? ` (${details.extension})` : ""}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Size"
                text={`${details.size}${details.directoryBreakdown ? ` • ${details.directoryBreakdown}` : ""}`}
              />
              <List.Item.Detail.Metadata.Label title="Modified" text={getCompactDate(details.modified)} />
              <List.Item.Detail.Metadata.Label title="Path" text={filePath} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
