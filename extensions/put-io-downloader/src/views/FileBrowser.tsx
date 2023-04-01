import { ActionPanel, showToast, Toast, Detail, List, Action, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import FileDetails from "../components/FileDetails";
import formatString from "../utils/formatString";
import formatSize from "../utils/formatSize";
import changeTimezone from "../utils/changeTimezone";
import timeDifference from "../utils/timeDifference";
import PutioAPI, { IFile } from "@putdotio/api-client";
import { preferences } from "../preferences";
import { exec } from "child_process";

function FileBrowser({ parent_file_id }: { parent_file_id: number }) {
  // State vars and handlers
  const [file, setFile] = useState<IFile>();
  const [fileUrl, setFileUrl] = useState<string>();
  const [files, setFiles] = useState<IFile[]>();
  const [selectedFileId, setSelectedFileId] = useState<number>();
  const [fileAction, setFileAction] = useState<number>();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [error, setError] = useState<Error>();
  const { push } = useNavigation();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  //
  // Populate the list of files (if a folder), or information about the file (if a single file).
  useEffect(() => {
    // Init put.io API
    const putioAPI = new PutioAPI({ clientID: Number(preferences.putioClientId) });
    putioAPI.setToken(preferences.putioOAuthToken);

    // Query for a list of files and then reverse-sort by creation date/time
    putioAPI.Files.Query(parent_file_id)
      .then((t) => {
        if (t.data.files.length == 0) {
          // If the files array is empty, it means this is just a file, not a directory.
          // Set the file to the 'parent' object, which contains the file info.
          setFile(t.data.parent);
          // Get the URL of the file
          putioAPI.File.GetStorageURL(t.data.parent.id)
            .then((t) => {
              console.log("File URL is: ", t.data.url);
              setFileUrl(t.data.url);
            })
            .catch((e) => {
              console.log("An error occurred while fetching file URL: ", e);
              setError(new Error("Error fetching file URL details. Check your Client ID and OAuth Token settings."));
            });
        } else {
          // The files array isn't empty, which means this is a folder.
          // Set the files object to the 'files' array, which contains the list of files in the folder.
          setFiles(t.data.files);
        }
      })
      .catch((e) => {
        console.log("An error occurred while fetching files: ", e);
        setError(new Error("Error fetching file details. Check your Client ID and OAuth Token settings."));
      });
  }, [parent_file_id]);

  //
  // When the selection changes, poll the file URL in the background so we can provide shortcuts to Download from the file list (rather than just file detail) view.
  useEffect(() => {
    if (selectedFileId !== undefined) {
      // Init put.io API
      const putioAPI = new PutioAPI({ clientID: Number(preferences.putioClientId) });
      putioAPI.setToken(preferences.putioOAuthToken);

      // Query for the file info, get the URL of the file and store it in the fileUrl state var.
      putioAPI.File.GetStorageURL(selectedFileId)
        .then((t) => {
          setFileUrl(t.data.url);
        })
        .catch((e) => {
          // console.log("An error occurred while fetching file URL: ", e);
          // setError(new Error("Error fetching file URL details. Check your Client ID and OAuth Token settings."));
        });
    }
  }, [selectedFileId]);

  //
  // Handle initiating file actions
  useEffect(() => {
    if (fileUrl !== undefined && fileAction !== undefined) {
      let cmd = "";
      switch (fileAction) {
        case 1:
          cmd = formatString(preferences.actionCommand1 ? preferences.actionCommand1 : "(no command defined)", fileUrl);
          break;
        case 2:
          cmd = formatString(preferences.actionCommand2 ? preferences.actionCommand2 : "(no command defined)", fileUrl);
          break;
      }
      exec(cmd, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          console.log(`error: ${error.message}`);
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Starting download failed.",
          });
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "⬇️ Download started.",
        });

        // Null out the download type so we can start another download again in the future.
        setFileAction(undefined);
      });
    }
  }, [fileAction]);

  // If neither files or file are populated yet, display an empty list with the loading animation.
  if (files === undefined && file === undefined) {
    return (
      <List isLoading={true} navigationTitle="Put.io Files">
        <List.EmptyView icon={{ source: "putio-icon.png" }} title="Fetching the list of files..." />
      </List>
    );
  } else if (files !== undefined && files?.length > 0) {
    //
    // List of files
    return (
      <List
        isLoading={files === undefined && file === undefined}
        isShowingDetail={isShowingDetail}
        navigationTitle="Put.io Files"
        onSelectionChange={(selectedFileId) => {
          if (selectedFileId === undefined) {
            return;
          }
          setFileUrl(undefined); // Clear the file URL because we're about to query the new one.
          setSelectedFileId(Number(selectedFileId));
        }}
      >
        {files.length == 0 ? (
          <List.EmptyView icon={{ source: "putio-icon.png" }} title="There doesn't seem to be anything here." />
        ) : (
          files &&
          Object.values(files).map((file) => {
            const accessories = [];
            accessories.push({ text: formatSize(file.size, true, 1) });
            // created_at is in UTC so we need to provide a UTC relative date for comparison.
            const now = changeTimezone(new Date(), "UTC");
            const created_at = new Date(file.created_at);
            if (created_at <= now) {
              accessories.push({ text: timeDifference(now, created_at) });
            }
            return (
              <List.Item
                key={`${file.id}`}
                id={`${file.id}`}
                icon={`${file.icon}`}
                title={`${file.name}`}
                actions={
                  <ActionPanel title="Actions">
                    <Action
                      title={"Browse File(s)"}
                      icon={Icon.List}
                      onAction={() => push(<FileBrowser parent_file_id={file.id} />)}
                    />
                    {fileUrl && <Action.OpenInBrowser url={fileUrl} />}
                    {fileUrl && (
                      <Action
                        title={preferences.actionTitle1 ? preferences.actionTitle1 : "(Action #1 Unconfigured)"}
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd"], key: "1" }}
                        onAction={() => {
                          setFileAction(1);
                        }}
                      />
                    )}
                    {fileUrl && (
                      <Action
                        title={preferences.actionTitle2 ? preferences.actionTitle2 : "(Action #2 Unconfigured)"}
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd"], key: "2" }}
                        onAction={() => {
                          setFileAction(2);
                        }}
                      />
                    )}
                  </ActionPanel>
                }
                accessories={accessories}
              />
            );
          })
        )}
      </List>
    );
  } else {
    if (file !== undefined) {
      //
      // One file - show the file details
      return (
        <Detail
          markdown={formatFileInfo(file)}
          metadata={<FileDetails file={file} />}
          actions={
            <ActionPanel title="File Actions">
              {fileUrl && <Action.OpenInBrowser url={fileUrl} />}
              {fileUrl && (
                <Action
                  title={preferences.actionTitle1 === null ? preferences.actionTitle1 : "(Action #1 Unconfigured)"}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                  onAction={() => {
                    setFileAction(1);
                  }}
                />
              )}
              {fileUrl && (
                <Action
                  title={preferences.actionTitle2 === null ? preferences.actionTitle2 : "(Action #2 Unconfigured)"}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "2" }}
                  onAction={() => {
                    setFileAction(2);
                  }}
                />
              )}
            </ActionPanel>
          }
        ></Detail>
      );
    } else {
      return (
        <List>
          <List.EmptyView icon={{ source: "putio-icon.png" }} title="There doesn't seem to be anything here." />
        </List>
      );
    }
  }
}

function formatFileInfo(file: IFile): string {
  return `
# ${file.name}
![](${file.screenshot})
`;
}

export default FileBrowser;
