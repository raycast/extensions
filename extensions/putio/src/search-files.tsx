import { List, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { withPutioClient } from "./api/withPutioClient";
import { searchFiles } from "./api/files";
import { FileListItem } from "./components/FileListItem";
import { localizeError, localizedErrorToToastOptions } from "./api/localizeError";

type Props = {
  arguments: {
    query?: string;
  };
};

const SearchFiles = (props: Props) => {
  const [searchText, setSearchText] = useState(props.arguments.query ?? "");
  const { isLoading, data, error, revalidate } = usePromise(searchFiles, [searchText], {
    execute: searchText !== "",
  });

  useEffect(() => {
    if (error) {
      showToast(localizedErrorToToastOptions(localizeError(error)));
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading || searchText === ""}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search in put.io"
      throttle
    >
      <List.Section title="Results" subtitle={data?.total.toString()}>
        {data?.files.map((file) => (
          <FileListItem key={file.id} file={file} onMutate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
};

export default function Command(props: Props) {
  return withPutioClient(<SearchFiles {...props} />);
}
