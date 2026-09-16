import { Icon, List } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import DetailsActions from "../actions/DetailsActions";
import getFaviconIcon from "../helpers/get-favicon-icon";
import { File } from "../types";
import FileItemDetail from "./FileItemDetail";

type Props = {
  file: File;
  files: File[];
  loading: boolean;
  showDetail: boolean;
  setShowDetail: Dispatch<SetStateAction<boolean>>;
  onFileUpdated?: (file: File) => void;
};
export default function FileListItem({ file, files, loading, ...actionProps }: Props): React.JSX.Element {
  const favorite = file.attributes.favorite;
  const tags = (file.attributes.tags || []).map((tag) => ({ text: tag }));

  return (
    <List.Item
      id={file.fullPath}
      title={file.attributes.title}
      subtitle={file.attributes.publisher ?? file.attributes.source}
      accessories={favorite == null ? tags : [...tags, { icon: Icon.Star }]}
      icon={getFaviconIcon(file.attributes)}
      actions={<DetailsActions file={file} files={files} {...actionProps} />}
      detail={<FileItemDetail file={file} loading={loading} />}
    />
  );
}
