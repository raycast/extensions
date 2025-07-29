import { closeMainWindow, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import FormData from "form-data";
import fetch from "node-fetch";
import { API_BASE_URL, UPLOAD_ENDPOINT } from "./constants";
import { UploadResponse } from "./types";

const exec = promisify(execCb);

export default async () => {
  const filePath = join(tmpdir(), `screenshot-${Date.now()}.png`);

  try {
    await closeMainWindow();
    await exec(`/usr/sbin/screencapture -i ${filePath}`);

    if (!existsSync(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot failed",
      });
      return;
    }
    const buffer = await readFile(filePath);

    const form = new FormData();
    form.append("image", buffer, {
      filename: "screenshot.png",
      contentType: "image/png",
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
  } catch (error) {
    showFailureToast(error, { title: "Failed to search image" });
  } finally {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }
};
