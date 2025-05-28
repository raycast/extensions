import { ActionPanel, Action, Icon, confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import type { IFile } from "@putdotio/api-client";
import { getPutioAccountInfo } from "../api/withPutioClient";
import { Files } from "../files";
import { RenameFile } from "../rename-file";
import { deleteFile } from "../api/files";
import { getAuthToken, useVLC } from "../utils";
import { FileURLProvider } from "@putdotio/utilities";
import PutioAPIClient from "@putdotio/api-client";

export const FileListItemNavigationActions = ({ file }: { file: IFile }) => {
  const vlc = useVLC();
  const fileURLProvider = new FileURLProvider(PutioAPIClient.DEFAULT_OPTIONS.baseURL!, getAuthToken());
  const browseURL = `https://put.io/files/${file.id}`;
  const downloadURL = fileURLProvider.getDownloadURL(file.id);
  const streamURL = fileURLProvider.getStreamURL(file);
  const mp4StreamURL = fileURLProvider.getMP4StreamURL(file);

  return (
    <>
      {file.file_type === "FOLDER" ? (
        <Action.Push title="Open" target={<Files id={file.id} name={file.name} />} icon={Icon.ArrowRight} />
      ) : null}

      <Action.OpenInBrowser title="Open in Browser" url={browseURL} icon="putio.png" />

      {downloadURL && <Action.OpenInBrowser title="Download in Browser" url={downloadURL} icon="putio.png" />}

      <Action.CopyToClipboard
        title="Copy URL"
        content={browseURL}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />

      {downloadURL && (
        <Action.CopyToClipboard
          title="Copy Download URL"
          content={downloadURL}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      )}

      {streamURL && <Action.CopyToClipboard title="Copy Stream URL" content={streamURL} />}

      {mp4StreamURL && (
        <Action.CopyToClipboard
          // eslint-disable-next-line @raycast/prefer-title-case -- MP4 is a proper noun
          title="Copy MP4 Stream URL"
          content={mp4StreamURL}
        />
      )}

      {vlc.isInstalled && streamURL && (
        <Action
          icon={Icon.FilmStrip}
          onAction={() => vlc.open(streamURL)}
          // eslint-disable-next-line @raycast/prefer-title-case -- VLC is a proper noun
          title="Open in VLC"
        />
      )}

      {vlc.isInstalled && mp4StreamURL && (
        <Action
          icon={Icon.FilmStrip}
          onAction={() => vlc.open(mp4StreamURL)}
          // eslint-disable-next-line @raycast/prefer-title-case -- VLC is a proper noun
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
