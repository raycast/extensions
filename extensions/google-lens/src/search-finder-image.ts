import { closeMainWindow, getSelectedFinderItems, getFrontmostApplication, showToast, Toast, open } from "@raycast/api";
import { readFile } from "fs/promises";
import FormData from "form-data";
import fetch from "node-fetch";
import { API_BASE_URL, UPLOAD_ENDPOINT, ACCEPTED_TYPES } from "./constants";
import { UploadResponse } from "./types";

export default async () => {
  try {
    const frontmostApplication = await getFrontmostApplication();
    if (frontmostApplication.name !== "Finder") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Finder is not the frontmost application",
      });
      return;
    }

    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image selected in Finder",
      });
      return;
    }

    const selectedFile = selectedItems[0];
    const filePath = selectedFile.path;
    const fileExtension = filePath.split(".").pop()?.toLowerCase();
    if (!fileExtension || !ACCEPTED_TYPES.includes(fileExtension)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported image type",
        message: `Supported types: ${ACCEPTED_TYPES.join(", ")}`,
      });
      return;
    }

    await closeMainWindow();

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
        await open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`);
      } else {
        throw new Error("Search failed");
      }
    } else {
      throw new Error("Search failed");
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Search failed",
    });
  }
};
