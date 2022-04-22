import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { AliyunDrive } from "@chyroc/aliyundrive";
import { useEffect, useState } from "react";
import { client } from "../api";
import DirectoryItem from "./DirectoryItem";
import FileItem from "./FileItem";

export interface IDirectoryProps {
  path: string;
  defaultDriveID: string;
}

export default function Directory(props: IDirectoryProps) {
  const [files, setFiles] = useState<AliyunDrive.File[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [fetchCursor, setFetchCursor] = useState(0);
  const defaultDriveID = props.defaultDriveID;

  const getFileList = async function (): Promise<AliyunDrive.GetFileListResp> {
    const resp = await client.getFileList({
      all: true,
      drive_id: defaultDriveID,
      parent_file_id: props.path || "root",
    });
    return resp.data;
  };

  useEffect(() => {
    const f = async () => {
      setLoading(true);
      try {
        const fileList = await getFileList();
        setLoading(false);
        setFiles(fileList.items);
        setHasMore(fileList.next_marker !== "");
      } catch (e) {
        setLoading(false);
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    };
    f();
  }, [fetchCursor]);

  return (
    <List searchBarPlaceholder={`Search AliyunDrive Files`} throttle={true} isLoading={loading}>
      {files.length > 0 && (
        <>
          <List.Section title={"files"}>
            {files.map((v) => {
              const isFolder = v.type === "folder";
              return isFolder ? (
                <DirectoryItem defaultDriveID={defaultDriveID} key={v.file_id} file={v} />
              ) : (
                <FileItem key={v.file_id} file={v} />
              );
            })}
          </List.Section>
          {hasMore ? (
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
