import { Action, ActionPanel, Icon, Keyboard, List, confirmAlert, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchFiles, GokapiFile, getFileTypeIcon, getFileTypeTag, deleteFile } from "./utils";
import { showFailureToast } from "@raycast/utils";
import QRCode from "qrcode"; // added import

export default function Command() {
  const [files, setFiles] = useState<GokapiFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(false);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({}); // added state for storing QR code data URLs keyed by file ID

  useEffect(() => {
    fetchFiles()
      .then((data) => {
        const fileData = data || [];
        setFiles(fileData);
        setIsLoading(false);
        // Generate QR codes for each file's download URL
        Promise.all(
          fileData.map((file) => QRCode.toDataURL(file.UrlDownload).then((qrData) => ({ id: file.Id, qrData }))),
        ).then((results) => {
          const mapping: Record<string, string> = {};
          results.forEach(({ id, qrData }) => {
            mapping[id] = qrData;
          });
          setQrCodes(mapping);
        });
      })
      .catch((error) => {
        console.error(error);
        showFailureToast(error, { title: "Failed to fetch files" });
        setIsLoading(false);
      });
  }, []);

  return (
    <List isShowingDetail={showingDetail} isLoading={isLoading}>
      {files.map((file) => (
        <List.Item
          key={file.Id}
          icon={getFileTypeIcon(file)}
          title={file.Name}
          subtitle={file.Size}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={file.UrlDownload} />
              <Action title={"Toggle Detail"} icon={Icon.Sidebar} onAction={() => setShowingDetail(!showingDetail)} />
              <Action.CopyToClipboard
                title="Copy Download URL"
                content={file.UrlDownload}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                icon={Icon.Download}
                title="Copy Hotlink URL"
                content={file.UrlHotlink}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Delete File"
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={Icon.Trash}
                onAction={async () => {
                  if (await confirmAlert({ title: "Are you sure you want to delete this file?" })) {
                    try {
                      await deleteFile(file.Id);
                      setFiles(files.filter((f) => f.Id !== file.Id));
                      await showToast({ title: "File Deleted", message: file.Name, style: Toast.Style.Success });
                    } catch (error) {
                      console.error(error);
                      showFailureToast(error as Error, { title: "Failed to delete file" });
                    }
                  }
                }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={qrCodes[file.Id] ? `![QR Code](${qrCodes[file.Id]})` : ""} // added markdown QR code above metadata, if available
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Size" text={file.Size} />
                  <List.Item.Detail.Metadata.Label title="MIME" text={file.ContentType} />
                  <List.Item.Detail.Metadata.TagList title="File Type">
                    {getFileTypeTag(file)}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Download URL"
                    target={file.UrlDownload}
                    text={file.UrlDownload}
                  />
                  <List.Item.Detail.Metadata.Link title="Hotlink" target={file.UrlHotlink} text={file.UrlHotlink} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Remaining download"
                    text={file.UnlimitedDownloads ? "Unlimited" : String(file.DownloadsRemaining)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Expires at"
                    text={file.UnlimitedTime ? "Never" : new Date(file.ExpireAt * 1000).toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Password protection"
                    text={file.IsPasswordProtected ? "Yes" : "No"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Encrypted"
                    text={file.IsEndToEndEncrypted ? "End-to-end" : file.IsEncrypted ? "Yes" : "No"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
