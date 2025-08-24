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

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    new URL(preferences.serverUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid server URL",
      message: "serverUrl has to be a URL",
    });
    return;
  }

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

    const uploadStream = got.put(fullUrl, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: monitorStream,
    });

    await pipelinePromise(fileStream, monitorStream);

    const response = await uploadStream;
    await Clipboard.copy(response.body);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied URL to clipboard",
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
