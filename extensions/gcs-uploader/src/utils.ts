import { getPreferenceValues, Clipboard } from "@raycast/api";
import execa from "execa";
import fs from "fs";
import mime from "mime-types";
import path from "path";
export async function getAccessToken(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.authMethod === "static") {
    if (!preferences.staticToken) {
      throw new Error(
        "Access Token is required when Authentication Method is set to 'Access Token'.",
      );
    }
    return preferences.staticToken;
  } else {
    try {
      const { stdout } = await execa("gcloud", ["auth", "print-access-token"], {
        shell: true,
        env: {
          PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:${process.env.PATH}`,
        },
      });
      return stdout.trim();
    } catch (error) {
      console.error("Error getting token from gcloud:", error);
      throw new Error(
        "Failed to get access token from gcloud. Make sure gcloud CLI is installed and you are logged in (`gcloud auth login`).",
      );
    }
  }
}

export async function uploadFileToGCS(
  filePath: string,
  token: string,
): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const bucketName = preferences.bucketName;
  const fileName = path.basename(filePath);
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  const objectName = `pasterly/${fileName}`;

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;

  const fileContent = fs.readFileSync(filePath);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: fileContent,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Upload failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  await response.json();

  const encodedObjectName = `pasterly/${encodeURIComponent(fileName)}`;

  if (preferences.cdnBaseUrl) {
    const cdnUrl = preferences.cdnBaseUrl.replace(/\/$/, "");
    return `${cdnUrl}/${encodedObjectName}`;
  } else {
    return `https://storage.googleapis.com/${bucketName}/${encodedObjectName}`;
  }
}

export async function getFileFromClipboard(): Promise<string | null> {
  try {
    const { file } = await Clipboard.read();

    if (file) {
      // file is a file:// URL, convert to path
      const filePath = file.startsWith("file://")
        ? decodeURIComponent(file.replace("file://", ""))
        : file;

      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  } catch (err) {
    console.error("Error reading files from clipboard:", err);
  }
  return null;
}
