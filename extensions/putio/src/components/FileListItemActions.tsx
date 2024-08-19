import { exec } from "child_process";
import { ActionPanel, Action, Icon, confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { IFile } from "@putdotio/api-client";
import { getPutioAccountInfo, getPutioClient } from "../api/withPutioClient";
import { Files } from "../files";
import { RenameFile } from "../rename-file";
import { deleteFile } from "../api/files";
import { useIsVlcInstalled } from "../utils";

const fetchFileDownloadURL = async (file: IFile) => {
  try {
    switch (file.file_type) {
      case "IMAGE":
      case "VIDEO": {
        const response = await getPutioClient().get(`/files/${file.id}/url`);
        return response.data.url as string;
      }

      default:
        return null;
    }
  } catch (error) {
    return null;
  }
};

const fetchFileURLs = async (file: IFile) => {
  const download = await fetchFileDownloadURL(file);

  return {
    download,
    browse: `https://put.io/files/${file.id}`,
    stream: file.stream_url,
    mp4Stream: file.mp4_stream_url,
  };
};

export const FileListItemNavigationActions = ({ file }: { file: IFile }) => {
  const isVlcInstalled = useIsVlcInstalled();
  const { data: urls } = useCachedPromise(fetchFileURLs, [file]);

  return (
    <>
      {file.file_type === "FOLDER" ? (
        <Action.Push title="Open" target={<Files id={file.id} name={file.name} />} icon={Icon.ArrowRight} />
      ) : null}

      {urls?.browse && <Action.OpenInBrowser title="Open in Browser" url={urls.browse} icon="putio.png" />}
      {urls?.download && <Action.OpenInBrowser title="Download in Browser" url={urls.download} icon="putio.png" />}

      {urls?.browse && (
        <Action.CopyToClipboard
          title="Copy URL"
          content={urls.browse}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}

      {urls?.download && (
        <Action.CopyToClipboard
          title="Copy Download URL"
          content={urls.download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      )}

      {urls?.stream && <Action.CopyToClipboard title="Copy Stream URL" content={urls.stream} />}

      {urls?.mp4Stream && <Action.CopyToClipboard title="Copy MP4 Stream URL" content={urls.mp4Stream} />}

      {isVlcInstalled && urls?.stream && (
        <Action
          icon={Icon.AppWindow}
          onAction={() => {
            exec(`vlc "${urls.stream}"`);
          }}
          title="Open in VLC"
        />
      )}

      {isVlcInstalled && urls?.mp4Stream && (
        <Action
          icon={Icon.AppWindow}
          onAction={() => {
            exec(`vlc "${urls.mp4Stream}"`);
          }}
          title="Open MP4 in VLC"
        />
      )}
    </>
  );
};

export const FileListItemMutationActions = ({ file, onMutate }: { file: IFile; onMutate: () => void }) => {
  const trashEnabled = getPutioAccountInfo().settings.trash_enabled;

  return (
    <>
      {file.is_shared ? null : (
        <ActionPanel.Section>
          <Action.Push
            title="Rename"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            target={<RenameFile file={file} onSuccess={onMutate} />}
          />

          <Action
            title={trashEnabled ? "Send to Trash" : "Delete"}
            icon={trashEnabled ? Icon.Trash : Icon.DeleteDocument}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              const run = async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: trashEnabled ? "Sending to trash..." : "Deleting file...",
                });

                try {
                  await deleteFile(file.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Aaand it's gone!";
                  onMutate();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to delete file";
                }
              };

              if (trashEnabled) {
                return run();
              }

              await confirmAlert({
                icon: Icon.DeleteDocument,
                title: `Are you sure you want to delete ${file.name}?`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                  onAction: run,
                },
                dismissAction: {
                  title: "Cancel",
                  style: Alert.ActionStyle.Cancel,
                },
              });
            }}
          />
        </ActionPanel.Section>
      )}
    </>
  );
};
