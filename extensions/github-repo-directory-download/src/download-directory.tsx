import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import yauzl from "yauzl";
import { mkdirp } from "mkdirp";
import { pipeline } from "stream";
import { promisify } from "util";

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

    // Use ReadableStream to process chunks
    const reader = response.body.getReader();
    const fileStream = fs.createWriteStream(tempFile);
    let downloadedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        downloadedBytes += value.length;
        const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);

        let progressMsg = `Downloading... ${downloadedMB} MB`;
        if (repoSizeMB > 0) {
          const percent = Math.min(Math.round((downloadedBytes / (repoSizeMB * 1024 * 1024)) * 100), 100);
          progressMsg += ` / ${repoSizeMB} MB (${percent}%)`;
        }

        onProgress(progressMsg);

        // Write chunk to file manually since we are consuming the stream
        // Note: fs.createWriteStream returns a Writable stream, we can write buffers
        // We handle backpressure simply by awaiting if needed, but synchronous write is usually fine for temp files
        // However, correct way with streams is to pipe. But since we need progress, we intercept.
        // Let's use a simpler approach: write directly.
        const canWrite = fileStream.write(value);
        if (!canWrite) {
          await new Promise((resolve) => fileStream.once("drain", resolve));
        }
      }
    }

    fileStream.end();
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // 3. Extract
    onProgress("Extracting files...");

    // Determine extract destination
    const folderName = dirPath ? path.basename(dirPath) : repo;
    const finalDest = path.join(destPath, folderName);

    if (!fs.existsSync(finalDest)) {
      await mkdirp(finalDest);
    }

    // Use yauzl for memory-efficient extraction
    await new Promise<void>((resolve, reject) => {
      yauzl.open(tempFile, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        let extractedCount = 0;
        let rootFolder = ""; // Will be detected from first entry

        zipfile.readEntry();

        zipfile.on("entry", (entry) => {
          // Detect root folder from first entry if not set
          if (!rootFolder) {
            rootFolder = entry.fileName.split("/")[0] + "/";
          }

          const prefix = dirPath ? `${rootFolder}${dirPath}/` : rootFolder;

          if (entry.fileName.endsWith("/")) {
            // Directory entry - skip or create if needed (mkdirp handles parent dirs)
            zipfile.readEntry();
          } else {
            // File entry
            if (entry.fileName.startsWith(prefix)) {
              // Extract
              const relativePath = entry.fileName.substring(prefix.length);
              const entryDest = path.join(finalDest, relativePath);
              const entryDir = path.dirname(entryDest);

              mkdirp(entryDir).then(() => {
                zipfile.openReadStream(entry, (err, readStream) => {
                  if (err) return reject(err);
                  const writeStream = fs.createWriteStream(entryDest);
                  readStream.pipe(writeStream);

                  writeStream.on("finish", () => {
                    extractedCount++;
                    zipfile.readEntry();
                  });
                  writeStream.on("error", reject);
                });
              });
            } else {
              // Skip irrelevant files
              zipfile.readEntry();
            }
          }
        });

        zipfile.on("end", () => {
          if (extractedCount === 0) {
            reject(new Error(`No files found in '${dirPath || "repository"}'`));
          } else {
            resolve();
          }
        });

        zipfile.on("error", reject);
      });
    });

    return finalDest;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}
