import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { client } from "../../api";
import { AliyunDrive } from "@chyroc/aliyundrive";
import { getLoginUser } from "../../api/api";
import { CreateFolder, Login, RenameFile, ShareFile } from "../index";

export default (props: { type?: "search" | "list" }) => {
  const [query, setQuery] = useState("");
  const [nextPage, setNextPage] = useState("");
  const [loading, setLoading] = useState(false);
  const [defaultDriveID, setDefaultDriveID] = useState<string>("");
  const { push } = useNavigation();
  const [parentIDs, setParentIDs] = useState<string[]>(["root"]);
  const [abort, setAbort] = useState<boolean>(false);
  const [files, setFiles] = useState<AliyunDrive.File[]>([]);
  const [refresh, setRefresh] = useState(1);
  const isSearchMode = props.type == "search";

  const getFileList = async function (): Promise<AliyunDrive.GetFileListResp> {
    if (isSearchMode) {
      if (!query) {
        return { items: [], next_marker: "" };
      }
      const resp = await client.searchFile({
        drive_id: defaultDriveID,
        marker: nextPage ? nextPage : undefined,
        query: {
          name: query,
        },
      });
      setNextPage(resp.data.next_marker);
      return resp.data;
    } else {
      const resp = await client.getFileList({
        all: true,
        drive_id: defaultDriveID,
        parent_file_id: parentIDs[parentIDs.length - 1],
      });
      return resp.data;
    }
  };

  useEffect(() => {
    const f = async () => {
      await client.init();

      setLoading(true);
      const getUser = await getLoginUser(client);
      setLoading(false);
      if (getUser.tokenInvalid) {
        // push
        push(
          <Login
            onFinish={async () => {
              try {
                setLoading(true);
                const user = (await client.getSelfUser()).data;
                setDefaultDriveID(user.default_drive_id);
                setLoading(false);
              } catch (e) {
                setLoading(false);
              }
            }}
          />
        );
        return;
      } else if (getUser.user) {
        setDefaultDriveID(getUser.user.default_drive_id);
      } else {
        await showToast(Toast.Style.Failure, "request fail", getUser.msg);
        setAbort(true);
        return;
      }
    };
    f();
  }, []);

  useEffect(() => {
    const f = async () => {
      if (!defaultDriveID) {
        return;
      }

      setLoading(true);
      try {
        const fileList = await getFileList();
        console.log("[file-list] get file", fileList.next_marker);
        console.log("[file-list] get file", fileList);
        setLoading(false);
        setFiles(fileList.items);
      } catch (e) {
        setLoading(false);
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
        setAbort(true);
      }
    };
    f();
  }, [query, defaultDriveID, refresh]);

  return (
    <List isLoading={loading} throttle={true} onSearchTextChange={isSearchMode ? setQuery : undefined}>
      {files &&
        files.length > 0 &&
        files.map((v) => {
          return (
            <List.Item
              title={v.name}
              key={v.file_id || v.content_hash}
              accessoryTitle={`${v.updated_at}`}
              icon={v.type == "file" ? Icon.Document : "folder.png"}
              actions={
                <ActionPanel>
                  {!isSearchMode && v.type == "folder" && (
                    <ActionPanel.Item
                      title={"Click"}
                      onAction={async () => {
                        setLoading(true);
                        const fileResp = await client.getFileList({
                          all: true,
                          drive_id: defaultDriveID,
                          parent_file_id: v.file_id,
                        });
                        console.log(`[file-list] 1 get file, pid: ${v.file_id}`, fileResp.data);
                        setLoading(false);
                        setFiles(fileResp.data.items);
                        setParentIDs([...parentIDs, v.file_id]);
                      }}
                    />
                  )}
                  {!isSearchMode && parentIDs && parentIDs.length > 1 && (
                    <ActionPanel.Item
                      title={"Return Parent Folder"}
                      onAction={async () => {
                        // click file
                        setLoading(true);
                        const fileResp = await client.getFileList({
                          all: true,
                          drive_id: defaultDriveID,
                          parent_file_id: parentIDs[parentIDs.length - 2],
                        });
                        console.log(`[file-list] 2 get file, pid: ${parentIDs[parentIDs.length - 2]}`, fileResp.data);
                        setLoading(false);
                        setParentIDs(parentIDs.slice(0, parentIDs.length - 1));
                        setFiles(fileResp.data.items);
                      }}
                    />
                  )}
                  {isSearchMode && nextPage && (
                    <ActionPanel.Item
                      title={"Load More"}
                      onAction={async () => {
                        // click file
                        setLoading(true);
                        const fileResp = await getFileList();
                        setLoading(false);
                        setFiles([...files, ...fileResp.items]);
                      }}
                    />
                  )}
                  {<Action.Push title="Share" target={<ShareFile driveID={defaultDriveID} fileID={v.file_id} />} />}
                  {
                    <ActionPanel.Item
                      title={v.starred ? "UnStar" : "Star"}
                      onAction={async () => {
                        await client.starFile({
                          drive_id: defaultDriveID,
                          file_id: v.file_id,
                          starred: !v.starred,
                        });
                        setFiles(files.map((f) => (f.file_id === v.file_id ? { ...f, starred: !v.starred } : f)));
                      }}
                    />
                  }
                  {
                    <Action.Push
                      title={"Create Folder"}
                      target={
                        <CreateFolder
                          driveID={defaultDriveID}
                          parentFileID={parentIDs[parentIDs.length - 1]}
                          onSuccess={async (_) => {
                            setRefresh(refresh + 1);
                          }}
                        />
                      }
                    />
                  }
                  {
                    <Action.Push
                      title={"Rename"}
                      target={
                        <RenameFile
                          driveID={defaultDriveID}
                          fileID={v.file_id}
                          onSuccess={async ({ data, name }) => {
                            setFiles(
                              files.map((f) => {
                                if (f.file_id === v.file_id) {
                                  f.name = name;
                                  return f;
                                }
                                return f;
                              })
                            );
                          }}
                        />
                      }
                    />
                  }

                  {
                    <ActionPanel.Item
                      title={"Delete"}
                      onAction={async () => {
                        const ok = await confirmAlert({
                          title: "Delete",
                          message: `Are you sure to delete ${v.name}?`,
                        });
                        if (ok) {
                          await client.deleteFile({
                            drive_id: defaultDriveID,
                            file_id: v.file_id,
                          });
                          setFiles(files.filter((f) => f.file_id !== v.file_id));
                        }
                      }}
                    />
                  }
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};
