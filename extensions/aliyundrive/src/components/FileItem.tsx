import { Icon, List } from "@raycast/api";
import { AliyunDrive } from "@chyroc/aliyundrive";

export interface IFileItemProps {
  file: AliyunDrive.File;
}

export default function FileItem(props: IFileItemProps) {
  const { file } = props;

  return <List.Item id={file.file_id || file.name} icon={Icon.Document} title={file.name} />;
}
