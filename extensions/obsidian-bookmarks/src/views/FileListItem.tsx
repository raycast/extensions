import { Icon, List } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import DetailsActions from "../actions/DetailsActions";
import { File } from "../types";
import FileItemDetail from "./FileItemDetail";

type Props = {
  file: File;
  loading: boolean;
  showDetail: boolean;
  setShowDetail: Dispatch<SetStateAction<boolean>>;
};
export default function FileListItem({ file, loading, showDetail, setShowDetail }: Props): JSX.Element {
  return (
    <List.Item
      id={file.fullPath}
      title={file.attributes.title}
      subtitle={file.attributes.publisher ?? file.attributes.source}
      accessories={(file.attributes.tags || []).map((tag) => ({ text: tag }))}
      icon={Icon.Link}
      actions={<DetailsActions file={file} showDetail={showDetail} setShowDetail={setShowDetail} />}
      detail={<FileItemDetail file={file} loading={loading} />}
    />
  );
}
