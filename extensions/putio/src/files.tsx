import { useEffect } from "react";
import { List, showToast, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { IFile } from "@putdotio/api-client";
import { withPutioClient } from "./api/withPutioClient";
import { fetchFiles } from "./api/files";
import { FileListItem } from "./components/FileListItem";
import { localizeError, localizedErrorToToastOptions } from "./api/localizeError";
import { EmptyView } from "./components/EmptyView";

export const Files = ({ id = 0, name = "Your Files" }: { id?: IFile["id"]; name?: IFile["name"] }) => {
  const { isLoading, data, error, revalidate } = usePromise(fetchFiles, [id]);

  useEffect(() => {
    if (error) {
      showToast(localizedErrorToToastOptions(localizeError(error)));
    }
  }, [error]);

  if (!data) {
    return <List isLoading={isLoading} navigationTitle={name} />;
  }

  switch (data.parent.file_type) {
    case "FOLDER":
      return (
        <List navigationTitle={name} searchBarPlaceholder={`Search in ${name}`}>
          <EmptyView title={data.files.length === 0 ? "This folder is empty" : name} />

          {data.files.map((file) => (
            <FileListItem key={file.id} file={file} onMutate={revalidate} />
          ))}
        </List>
      );

    default:
      return <Detail markdown={data.parent.name} />;
  }
};

export default function Command() {
  return withPutioClient(<Files />);
}
