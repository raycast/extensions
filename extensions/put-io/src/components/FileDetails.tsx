import { Color, Detail, Icon } from "@raycast/api";
import formatDate from "../utils/formatDate";
import formatSize from "../utils/formatSize";
import PutioAPI, { IFile } from "@putdotio/api-client";

function FileDetails({ file }: { file: IFile }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={file.name} icon={Icon.BlankDocument} />
      <Detail.Metadata.Label title="Size" text={formatSize(file.size, true, 2)} icon={Icon.List} />
      <Detail.Metadata.Label title="Created" text={formatDate(new Date(file.created_at))} icon={Icon.Calendar} />
      <Detail.Metadata.TagList title="Type">
        <Detail.Metadata.TagList.Item text={file.content_type} color={Color.Orange} icon={Icon.Document} />
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

export default FileDetails;
