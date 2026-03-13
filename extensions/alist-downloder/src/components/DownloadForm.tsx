import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { join } from "path";
import { homedir } from "os";
import fs from "fs";
import { fetchFileDetails } from "../utils/api";
import { AlistItem } from "../utils/types";
import { DownloadCMD, sleep } from "../utils/helpers";
import { CMD, HOST } from "../preferences";

interface DownloadFormProps {
  item: AlistItem;
  token: string;
  path: string;
}

export function displayFileSize(item: AlistItem) {
  if (item.size < 1024) {
    return `${item.size} B`;
  } else if (item.size < 1024 * 1024) {
    return `${(item.size / 1024).toFixed(2)} KB`;
  } else if (item.size < 1024 * 1024 * 1024) {
    return `${(item.size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(item.size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export function DownloadForm({ item, token, path }: DownloadFormProps) {
  const [filename, setFilename] = useState<string>(item.name);
  const { pop } = useNavigation();

  const handleSubmit = async (values: { folders: string[] }) => {
    const destination = values.folders[0];
    if (!fs.existsSync(destination) || !fs.lstatSync(destination).isDirectory()) {
      showToast(Toast.Style.Failure, "Invalid Destination", "Selected destination directory does not exist.");
      return false;
    }

    const fileDetails = await fetchFileDetails(token, `${path}/${item.name}`);
    const downloadLink = `${HOST}/d/${encodeURIComponent(item.name)}?sign=${fileDetails.sign}`;

    const downloadPath = join(destination, filename);
    const command = new DownloadCMD(CMD, downloadLink, downloadPath);
    showToast(Toast.Style.Animated, "Executing download command...");
    const isFailed = await command.execute();
    isFailed
      ? showToast(Toast.Style.Failure, "Failed to download file", "Check the console for more information.")
      : showToast(Toast.Style.Success, "File downloaded successfully");
    await sleep(1000);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Downloading ${item.name}`} />
      <Form.TextField id="filename" title="Filename" placeholder="Filename" value={filename} onChange={setFilename} />
      <Form.FilePicker
        id="folders"
        title="Folder"
        defaultValue={[`${homedir()}/Downloads`]}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
