import {
  closeMainWindow,
  getSelectedFinderItems,
  getFrontmostApplication,
  showToast,
  Toast,
  open,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import FormData from "form-data";
import fetch from "node-fetch";
import { API_BASE_URL, UPLOAD_ENDPOINT, ACCEPTED_TYPES } from "./constants";
import { UploadResponse } from "./types";

const exec = promisify(execCb);

export default async () => {
  const preferences = getPreferenceValues();
  const turnOffUploadAlert = preferences.turnOffUploadAlert;

  let usedScreenshot = false;
  let filePath = "";
  let fileExtension = "";
  let tempScreenshot = false;

  if (!turnOffUploadAlert) {
    if (
      !(await confirmAlert({
        title: "Are you sure upload image?",
        message:
          "The image will be uploaded to a third-party server maintained by the extension author to generate a public URL for Google Lens. Please avoid uploading sensitive content. (You can disable this warning in preferences)",
      }))
    ) {
      return;
    }
  }

  try {
    // Check if Finder is the frontmost application
    const frontmostApplication = await getFrontmostApplication();
    if (frontmostApplication.name === "Finder") {
      await showToast({
        style: Toast.Style.Animated,
        title: "Checking selected image in Finder...",
      });
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0) {
        const selectedFile = selectedItems[0];
        filePath = selectedFile.path;
        fileExtension = filePath.split(".").pop()?.toLowerCase() ?? "";
        if (!fileExtension || !ACCEPTED_TYPES.includes(fileExtension)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Unsupported image type",
            message: `Supported types: ${ACCEPTED_TYPES.join(", ")}`,
          });
          return;
        }
      }
    }

    // If no image is selected in Finder, enter screenshot mode
    if (!filePath) {
      usedScreenshot = true;
      tempScreenshot = true;
      filePath = join(tmpdir(), `screenshot-${Date.now()}.png`);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "No image selected, please take a screenshot...",
      });
      setTimeout(() => {
        toast.hide();
      }, 1500);
      await closeMainWindow();
      await exec(`/usr/sbin/screencapture -i ${filePath}`);
      if (!existsSync(filePath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Screenshot cancelled",
        });
        return;
      }
      fileExtension = "png";
    } else {
      await closeMainWindow();
    }

    await showToast({
      style: Toast.Style.Animated,
      title: usedScreenshot ? "Uploading screenshot to Google Lens..." : "Uploading image to Google Lens...",
    });

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const buffer = await readFile(filePath);
    const form = new FormData();
    form.append("image", buffer, {
      filename: filePath.split("/").pop(),
      contentType: `image/${fileExtension}`,
    });

    const res = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    if (res.ok) {
      const result = (await res.json()) as UploadResponse;
      if (result.filename) {
        const imageUrl = `${API_BASE_URL}/image/${result.filename}`;
        await showToast({
          style: Toast.Style.Success,
          title: "Opening Google Lens...",
        });
        await open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`);
      } else {
        throw new Error("Search failed");
      }
    } else {
      throw new Error("Search failed");
    }
  } catch (error) {
    showFailureToast(error, { title: usedScreenshot ? "Screenshot search failed" : "Image search failed" });
  } finally {
    // Delete temp screenshot if created
    if (tempScreenshot && filePath && existsSync(filePath)) {
      await unlink(filePath);
    }
  }
};
