import { showToast, Toast, launchCommand, LaunchType, Clipboard } from "@raycast/api";
import { getPreferences } from "./preferences";
import fs from "fs";
import path from "path";
import axios from "axios";
import { saveUploadRecord } from "./storage";
import { fileTypeFromFile } from "file-type";

const CHUNK_SIZE = 4 * 1024 * 1024;

export async function uploadFile(filePath: string) {
  let fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;

  if (!path.extname(fileName)) {
    try {
      const fileType = await fileTypeFromFile(filePath);

      if (fileType) {
        fileName = `${fileName}.${fileType.ext}`;
      }
    } catch (error) {
      // Continue with original filename if detection fails
    }
  }

  try {
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const createResponse = await axios.post("https://streamshare.wireway.ch/api/create", { name: fileName, totalChunks });
    const { fileIdentifier, deletionToken } = createResponse.data;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uploading ${fileName}`,
      message: "0%",
    });

    const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
    let uploadedSize = 0;
    let chunkId = 0;

    for await (const chunk of fileStream) {
      await axios.post(`https://streamshare.wireway.ch/api/upload/${fileIdentifier}/${chunkId}`, chunk, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": chunk.length,
        },
      });
      chunkId++;
      uploadedSize += chunk.length;
      const percentCompleted = Math.round((uploadedSize * 100) / fileSize);
      toast.message = `${percentCompleted}%`;
    }

    await axios.post(`https://streamshare.wireway.ch/api/upload-complete/${fileIdentifier}`);

    const downloadUrl = `https://streamshare.wireway.ch/download/${fileIdentifier}`;
    const deletionUrl = `https://streamshare.wireway.ch/api/delete/${fileIdentifier}/${deletionToken}`;
    const preferences = getPreferences();

    if (preferences.copyUrlToClipboard) {
      await Clipboard.copy(downloadUrl);
    }

    const uploadRecord = {
      sourceFileName: fileName,
      downloadUrl,
      deletionUrl,
      timestamp: Date.now(),
    };
    await saveUploadRecord(uploadRecord);

    await showToast({
      style: Toast.Style.Success,
      title: preferences.copyUrlToClipboard ? "Copied URL to clipboard" : "Upload complete",
      message: fileName,
      primaryAction: {
        title: "View Uploads",
        onAction: () => launchCommand({ name: "viewHistory", type: LaunchType.UserInitiated }),
      },
    });
  } catch (error) {
    await showToast({
      title: `Failed to upload ${fileName}`,
      message: error instanceof Error ? error.message : String(error),
      style: Toast.Style.Failure,
    });
  }
}
