import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { FileThumbnails, ProjectFile } from "../types";
import { formatDate, usePenpotFetch } from "../utils";

type Props = {
  file: ProjectFile;
};

export default function FileThumbnail({ file }: Props) {
  const { data, isLoading, revalidate } = usePenpotFetch<FileThumbnails>(
    `/get-file-object-thumbnails?file-id=${file.id}`,
  );

  return (
    <Detail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
      markdown={`${Object.values(data || {}).map((src) => `![](${src})`)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={file.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Modified At" text={formatDate(file.modifiedAt)} />
          <Detail.Metadata.Label title="Created At" text={formatDate(file.createdAt)} />
        </Detail.Metadata>
      }
    />
  );
}
