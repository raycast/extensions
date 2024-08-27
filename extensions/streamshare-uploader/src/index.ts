import { showToast, Toast, open, getSelectedFinderItems, Clipboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import axios from "axios";
import WebSocket from "ws";

const CHUNK_SIZE = 8 * 1024 * 1024; // 2MB

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      await showToast({ title: "No file selected", style: Toast.Style.Failure });
      return;
    }
    await uploadFile(selectedItems[0].path);
  } catch (error) {
    await showToast({ title: "Error selecting file", style: Toast.Style.Failure });
  }
}

async function uploadFile(filePath: string) {
  if (!fs.statSync(filePath).isFile()) {
    await showToast({ title: "Selected item is not a file", style: Toast.Style.Failure });
    return;
  }

  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;

  try {
    const createResponse = await axios.post("https://streamshare.wireway.ch/api/create", { name: fileName });
    const { fileIdentifier, deletionToken } = createResponse.data;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uploading ${fileName}`,
      message: "0%",
    });

    const ws = new WebSocket(`wss://streamshare.wireway.ch/api/upload/${fileIdentifier}`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", async () => {
        const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
        let uploadedSize = 0;

        for await (const chunk of fileStream) {
          ws.send(chunk);
          await new Promise<void>((resolveAck) => {
            ws.once("message", (ack) => {
              if (ack.toString() !== "ACK") {
                reject(new Error("Failed to receive ACK"));
              }
              resolveAck();
            });
          });
          uploadedSize += chunk.length;
          const percentCompleted = Math.round((uploadedSize * 100) / fileSize);
          toast.message = `${percentCompleted}%`;
        }

        ws.close(1000, "FILE_UPLOAD_DONE");
        resolve();
      });

      ws.on("error", (error) => {
        reject(error);
      });
    });

    const downloadUrl = `https://streamshare.wireway.ch/download/${fileIdentifier}`;
    const deletionUrl = `https://streamshare.wireway.ch/api/delete/${fileIdentifier}/${deletionToken}`;

    await Clipboard.copy(downloadUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied URL to clipboard",
      message: `${fileName}`,
      primaryAction: {
        title: "Open Download in Browser",
        onAction: () => open(downloadUrl),
      },
      secondaryAction: {
        title: "Delete File",
        onAction: async () => {
          try {
            await axios.get(deletionUrl);
            await showToast({
              style: Toast.Style.Success,
              title: "File deleted successfully",
            });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to delete file",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
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
