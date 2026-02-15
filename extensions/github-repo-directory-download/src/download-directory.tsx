import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";

interface FormValues {
  url: string;
  downloadPath: string[];
}

interface ParsedUrl {
  owner: string;
  repo: string;
  branch?: string;
  dirPath?: string;
}

export default function Command() {
  const [downloadPath, setDownloadPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();

  useEffect(() => {
    async function loadPreferences() {
      const storedPath = await LocalStorage.getItem<string>("lastDownloadPath");
      if (storedPath && fs.existsSync(storedPath)) {
        setDownloadPath([storedPath]);
      } else {
        const homeDir = os.homedir();
        const downloadsDir = path.join(homeDir, "Downloads");
        if (fs.existsSync(downloadsDir)) {
          setDownloadPath([downloadsDir]);
        }
      }
    }
    loadPreferences();
  }, []);

  function validateUrl(value: string | undefined) {
    if (!value) return "GitHub URL is required";
    try {
      const url = new URL(value);
      if (url.hostname !== "github.com") return "Must be a GitHub URL";
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return "Invalid repository URL";
    } catch {
      return "Invalid URL format";
    }
    return undefined;
  }

  async function handleSubmit(values: FormValues) {
    const error = validateUrl(values.url);
    if (error) {
      setUrlError(error);
      return;
    }

    if (!values.downloadPath || values.downloadPath.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a download location" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Download...",
    });

    try {
      const destPath = values.downloadPath[0];
      await LocalStorage.setItem("lastDownloadPath", destPath);

      const result = await downloadGitHubDirectory(values.url, destPath, (msg) => {
        toast.message = msg;
      });

      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = `Saved to ${path.basename(result)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="GitHub URL"
        placeholder="https://github.com/owner/repo/tree/main/folder"
        error={urlError}
        onChange={() => {
          if (urlError) setUrlError(undefined);
        }}
      />
      <Form.FilePicker
        id="downloadPath"
        title="Download Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={downloadPath}
        onChange={setDownloadPath}
      />
    </Form>
  );
}

function parseGitHubUrl(urlStr: string): ParsedUrl {
  const url = new URL(urlStr);
  const parts = url.pathname.split("/").filter(Boolean);

  const owner = parts[0];
  const repo = parts[1];
  let branch: string | undefined;
  let dirPath: string | undefined;

  if (parts.length > 2 && parts[2] === "tree") {
    branch = parts[3];
    if (parts.length > 4) {
      dirPath = parts.slice(4).join("/");
    }
  }

  return { owner, repo, branch, dirPath };
}

async function downloadGitHubDirectory(
  url: string,
  destPath: string,
  onProgress: (message: string) => void,
): Promise<string> {
  const { owner, repo, branch, dirPath } = parseGitHubUrl(url);

  // 1. Get Repo Metadata (Size & Default Branch)
  onProgress("Fetching repository info...");
  let targetBranch = branch;
  let repoSizeMB = 0;

  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (apiRes.ok) {
      const data = (await apiRes.json()) as { default_branch: string; size: number };
      if (!targetBranch) targetBranch = data.default_branch;
      // GitHub API returns size in KB
      repoSizeMB = Math.round(data.size / 1024);
    }
  } catch {
    // Ignore API errors, fallback to defaults
  }

  if (!targetBranch) targetBranch = "main";

  // 2. Start Download
  const sizeMsg = repoSizeMB > 0 ? `~${repoSizeMB} MB` : "";
  onProgress(`Downloading ${sizeMsg}...`);

  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${targetBranch}.zip`;
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `${repo}-${Date.now()}.zip`);

  try {
    const response = await fetch(zipUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Branch '${targetBranch}' not found.`);
      }
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    if (!response.body) throw new Error("Empty response body");

    // Create a write stream
    const fileStream = fs.createWriteStream(tempFile);
    const reader = response.body.getReader();
    let downloadedBytes = 0;

    // Read the stream chunk by chunk
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        downloadedBytes += value.length;
        const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);

        // Update progress every chunk might be too frequent, but React handles it or we can throttle
        // For Raycast toast, frequent updates are okay-ish, but let's just update text
        onProgress(`Downloading... ${downloadedMB} MB`);

        // Write to file
        fileStream.write(Buffer.from(value));
      }
    }

    fileStream.end();

    // Wait for file to be fully written
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // 3. Extract
    onProgress("Extracting files...");
    const zip = new AdmZip(tempFile);
    const zipEntries = zip.getEntries();

    const firstEntry = zipEntries[0];
    if (!firstEntry) throw new Error("Empty zip archive");

    // GitHub zip structure is `repo-branch/...`
    const rootFolder = firstEntry.entryName.split("/")[0];
    const prefix = dirPath ? `${rootFolder}/${dirPath}/` : `${rootFolder}/`;

    // Determine extract destination
    const folderName = dirPath ? path.basename(dirPath) : repo;
    const finalDest = path.join(destPath, folderName);

    if (!fs.existsSync(finalDest)) {
      fs.mkdirSync(finalDest, { recursive: true });
    }

    let extractedCount = 0;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      if (entry.entryName.startsWith(prefix)) {
        // Remove prefix to get relative path inside the target folder
        const relativePath = entry.entryName.substring(prefix.length);
        const entryDest = path.join(finalDest, relativePath);
        const entryDir = path.dirname(entryDest);

        if (!fs.existsSync(entryDir)) {
          fs.mkdirSync(entryDir, { recursive: true });
        }

        fs.writeFileSync(entryDest, entry.getData());
        extractedCount++;
      }
    }

    if (extractedCount === 0) {
      throw new Error(`No files found in '${dirPath || "repository"}'`);
    }

    return finalDest;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}
