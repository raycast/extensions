import fs from "fs";
import got from "got";
import {
  getSelectedFinderItems,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
} from "@raycast/api";
import path from "path";
import { pipeline, PassThrough } from "stream";
import { promisify } from "util";

interface Preferences {
  serverUrl: string;
}

export default async function Command(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const filePaths = await getSelectedFinderItems();
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
      });
      return;
    }

    const filePath = filePaths[0].path;
    const fileName = path.basename(filePath);
    const serverUrl = preferences.serverUrl;
    const fullUrl = `${serverUrl}/${fileName}`;

    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileStream = fs.createReadStream(filePath);

    let uploadedBytes = 0;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uploading ${fileName}`,
      message: "0%",
    });

    const pipelinePromise = promisify(pipeline);

    const monitorStream = new PassThrough();

    monitorStream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      const uploadPercentage = Math.round(
        (uploadedBytes / fileSizeInBytes) * 100,
      );
      toast.message = `${uploadPercentage}%`;
    });

    // Use got.stream.put to initiate the upload, attaching the monitorStream to track progress
    const uploadStream = got.put(fullUrl, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: monitorStream,
    });

    // Pipe fileStream through monitorStream to uploadStream
    await pipelinePromise(fileStream, monitorStream);

    // After upload completes, handle the server's response or perform additional actions as needed
    // Clipboard.copy(responseUrl) // Adjust this line based on your actual response handling
    const response = await uploadStream;
    await Clipboard.copy(response.body);

    await showToast({
      style: Toast.Style.Success,
      title: "Upload successful",
      message: fileName,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Upload failed",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
