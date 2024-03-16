import { createWriteStream, existsSync } from "fs";
import { homedir } from "os";

import { Action, ActionPanel, Icon, List, showInFinder, showToast, Toast, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";
import { filesize } from "filesize";
import fetch from "node-fetch";

import { Attachment } from "../api/issues";
import { getJiraCredentials } from "../api/jiraCredentials";
import { getUserAvatar } from "../helpers/avatars";

type IssueAttachmentsProps = {
  attachments: Attachment[];
};

export default function IssueAttachments({ attachments }: IssueAttachmentsProps) {
  const { authorizationHeader } = getJiraCredentials();

  const { data, isLoading } = useCachedPromise(() => {
    return Promise.all(
      attachments.map((attachment) => {
        // We need to make an authenticated request to get the image's content
        if (attachment.thumbnail) {
          return fetch(attachment.thumbnail, { headers: { Authorization: authorizationHeader } }).then((result) => ({
            ...attachment,
            thumbnailImage: result.url,
          }));
        }

        return Promise.resolve({ ...attachment, thumbnailImage: null });
      }),
    );
  });

  const basePath = `${homedir()}/Downloads`;

  async function downloadFile(attachment: Attachment) {
    const response = await fetch(attachment.content, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.body) {
      throw new Error();
    }

    let filePath = `${basePath}/${attachment.filename}`;

    // Prevent overriding existing files with the same name
    if (existsSync(filePath)) {
      let counter = 1;
      const fileNameWithoutExtension = attachment.filename.split(".")[0];
      const fileExtension = attachment.filename.split(".")[1];

      do {
        filePath = `${basePath}/${fileNameWithoutExtension} (${counter}).${fileExtension}`;
        counter++;
      } while (existsSync(filePath));
    } else {
      const fileStream = createWriteStream(filePath);
      await response.body?.pipe(fileStream);
    }

    const fileStream = createWriteStream(filePath);
    response.body?.pipe(fileStream);

    return new Promise((resolve, reject) => {
      fileStream.on("finish", () => {
        return resolve(filePath);
      });

      fileStream.on("error", () => {
        return reject();
      });
    });
  }

  async function downloadSingleFile(attachment: Attachment) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Downloading file", message: attachment.filename });
      const filePath = await downloadFile(attachment);

      if (typeof filePath === "string") {
        await showToast({
          style: Toast.Style.Success,
          title: "Downloaded file",
          message: filePath,
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction() {
              open(filePath);
            },
          },
          secondaryAction: {
            title: "Show File in Finder",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction() {
              showInFinder(filePath);
            },
          },
        });
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to download file", message: attachment.filename });
    }
  }

  async function downloadAllFiles() {
    try {
      const allAttachmentsFileNames = attachments.map((attachment) => attachment.filename).join(", ");
      await showToast({
        style: Toast.Style.Animated,
        title: "Downloading all files",
        message: allAttachmentsFileNames,
      });

      await Promise.all(attachments.map((attachment) => downloadFile(attachment)));
      await showToast({
        style: Toast.Style.Success,
        title: "Downloaded all files",
        message: allAttachmentsFileNames,
        primaryAction: {
          title: "Show Files in Finder",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction() {
            showInFinder(basePath);
          },
        },
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to download all files" });
    }
  }

  return (
    <List isLoading={isLoading}>
      {data?.map((attachment) => {
        const date = new Date(attachment.created);

        return (
          <List.Item
            key={attachment.id}
            icon={{ value: attachment.thumbnailImage || Icon.Document, tooltip: `File Type: ${attachment.mimeType}` }}
            title={attachment.filename}
            accessories={[
              {
                text: `${filesize(attachment.size, { round: 0 })}`,
                tooltip: `Size: ${filesize(attachment.size, { fullform: true })}`,
              },
              { date, tooltip: format(date, "EEEE d MMMM yyyy 'at' HH:mm") },
              {
                icon: getUserAvatar(attachment.author),
                tooltip: `Author: ${attachment.author.displayName}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action icon={Icon.Download} title="Download File" onAction={() => downloadSingleFile(attachment)} />

                <Action icon={Icon.Download} title="Download All Files" onAction={downloadAllFiles} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
