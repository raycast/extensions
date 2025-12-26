import { getPreferenceValues, showToast, Toast, showHUD, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import * as fs from "fs";

interface Preferences {
  defaultRepo?: string;
  githubToken?: string;
}

interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp"];

function parseRepoUrl(url: string): RepoInfo | null {
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?(?:\/blob\/([^/]+))?/);
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      repo: githubMatch[2],
      branch: githubMatch[3] || githubMatch[4] || "main",
    };
  }

  const simpleMatch = url.match(/^([^/]+)\/([^/]+)$/);
  if (simpleMatch) {
    return {
      owner: simpleMatch[1],
      repo: simpleMatch[2],
      branch: "main",
    };
  }

  return null;
}

function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function uploadImageToRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Add image: ${targetPath}`,
      content: base64Content,
      branch: branch,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 422 && error.message?.includes("already exists")) {
      // File exists, try to update it
      return updateImageInRepo(repoInfo, filePath, targetPath, githubToken);
    }
    throw new Error(error.message || `Failed to upload: ${response.statusText}`);
  }
}

async function updateImageInRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Get current file SHA
  const getResponse = await fetch(`${apiUrl}?ref=${branch}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to get file info: ${getResponse.statusText}`);
  }

  const fileInfo = await getResponse.json();
  const sha = fileInfo.sha;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Update image: ${targetPath}`,
      content: base64Content,
      branch: branch,
      sha: sha,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update: ${response.statusText}`);
  }
}

export default async function UploadImages() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultRepo = preferences.defaultRepo?.trim() || "";
  const githubToken = preferences.githubToken?.trim();

  if (!githubToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "GitHub Token Required",
      message: "Please add a GitHub token in extension preferences to upload images.",
    });
    return;
  }

  if (!defaultRepo) {
    showToast({
      style: Toast.Style.Failure,
      title: "No Repository Configured",
      message: "Please set a default repository in extension preferences.",
    });
    return;
  }

  const parsed = parseRepoUrl(defaultRepo);
  if (!parsed) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Repository URL",
      message: "Please check your repository URL in preferences.",
    });
    return;
  }

  try {
    const selectedItems = await getSelectedFinderItems();
    const imageFiles = selectedItems.filter((item) => {
      return isImageFile(item.path);
    });

    if (imageFiles.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Images Selected",
        message: "Please select image files in Finder first.",
      });
      return;
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Uploading images...",
      message: `Uploading ${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""}`,
    });

    const uploadPromises = imageFiles.map(async (file) => {
      const fileName = file.path.split("/").pop() || "image";
      const targetPath = fileName;
      await uploadImageToRepo(parsed, file.path, targetPath, githubToken);
    });

    await Promise.all(uploadPromises);

    // Signal to view component that cache was cleared (set before clearing)
    await LocalStorage.setItem("cache-cleared", Date.now().toString());
    // Clear cache so the view refreshes with new images
    await LocalStorage.removeItem("cached-images");

    showHUD(`✅ Uploaded ${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""}`);
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Upload Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
