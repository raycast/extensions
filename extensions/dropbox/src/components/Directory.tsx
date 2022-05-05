import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { files } from "dropbox";
import { useEffect, useState } from "react";
import { dbxListAnyFiles } from "../api";
import FileItem from "./FileItem";
import DirectoryItem from "./DirectoryItem";

export interface IDirectoryProps {
  path: string;
}

export default function Directory(props: IDirectoryProps) {
  const [files, setFiles] = useState<Array<files.FileMetadataReference | files.FolderMetadataReference>>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(props.path);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [fetchCursor, setFetchCursor] = useState(0);

  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await dbxListAnyFiles({ path: path, query: query, cursor: cursor });
        setFiles(cursor ? [...files, ...res.entries] : res.entries);
        setCursor(res.cursor);
        setHasMore(res.has_more);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: `${e}`,
        });
      }
    };
    f();
  }, [query, path, fetchCursor]);

  return (
    <List
      searchBarPlaceholder={`Search Dropbox Files`}
      throttle={true}
      onSearchTextChange={(query) => {
        setQuery(query);
        setCursor("");
      }}
      isLoading={loading}
    >
      {files.length > 0 && (
        <>
          <List.Section title={"files"}>
            {files.map((v) => {
              const isFolder = v[".tag"] === "folder";
              return isFolder ? <DirectoryItem key={v.id} file={v} /> : <FileItem key={v.id} file={v} />;
            })}
          </List.Section>
          {hasMore && cursor ? (
            <List.Section title={"page"}>
              <List.Item
                title={"Next Page"}
                actions={
                  <ActionPanel>
                    <Action
                      title={"Next Page"}
                      onAction={() => {
                        setFetchCursor(fetchCursor + 1);
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
