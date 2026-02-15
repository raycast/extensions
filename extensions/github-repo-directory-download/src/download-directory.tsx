import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import yauzl from "yauzl";
import { mkdirp } from "mkdirp";
import { pipeline } from "stream";
import { promisify } from "util";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const streamPipeline = promisify(pipeline);

interface FormValues {
  url: string;
  downloadPath: string[];
}

interface ParsedUrl {
  owner: string;
  repo: string;
  type: "tree" | "blob" | "root";
  ref?: string; // branch or commit
  path?: string;
}

interface Preferences {
  githubToken?: string;
  autoLoadUrl: boolean;
}

export default function Command() {
  const [downloadPath, setDownloadPath] = useState<string[]>([]);
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function init() {
      // Load last download path
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

      // Auto-load URL from clipboard
      if (preferences.autoLoadUrl) {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && isValidGitHubUrl(clipboardText)) {
          setUrl(clipboardText);
        }
      }
    }
    init();
  }, []);

  function isValidGitHubUrl(value: string): boolean {
    try {
      const urlObj = new URL(value);
      return urlObj.hostname === "github.com";
    } catch {
      return false;
    }
  }

  function validateUrl(value: string | undefined) {
    if (!value) return "GitHub URL is required";
    try {
      const urlObj = new URL(value);
      if (urlObj.hostname !== "github.com") return "Must be a valid GitHub URL (github.com)";

      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return "Invalid repository URL (needs owner/repo)";
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

      const resultPath = await downloadGitHubContent(values.url, destPath, preferences.githubToken, (msg) => {
        toast.message = msg;
      });

      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = `Saved to ${path.basename(resultPath)}`;

      // Add primary action to open the downloaded item
      toast.primaryAction = {
        title: "Open in Finder",
        onAction: () => open(resultPath),
      };
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
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
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

  // Default to root
  let type: ParsedUrl["type"] = "root";
  let ref: string | undefined;
  let filePath: string | undefined;

  if (parts.length > 2) {
    const typePart = parts[2];
    if (typePart === "tree") {
      type = "tree";
      ref = parts[3];
      if (parts.length > 4) filePath = parts.slice(4).join("/");
    } else if (typePart === "blob") {
      type = "blob";
      ref = parts[3];
      if (parts.length > 4) filePath = parts.slice(4).join("/");
    }
  }

  return { owner, repo, type, ref, path: filePath };
}

async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        // Let the caller handle the 404 if it's private and no token
        // But here we just return default 'main' if we can't find it
        return "main";
      }
      return "main";
    }
    const data = (await response.json()) as { default_branch: string };
    return data.default_branch || "main";
  } catch {
    return "main";
  }
}

async function downloadGitHubContent(
  url: string,
  destPath: string,
  token: string | undefined,
  onProgress: (message: string) => void,
): Promise<string> {
  const parsed = parseGitHubUrl(url);
  const { owner, repo, type } = parsed;
  let { ref } = parsed;
  const { path: targetPath } = parsed;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // 1. Resolve Branch/Ref if missing
  if (!ref) {
    onProgress("Resolving default branch...");
    ref = await getDefaultBranch(owner, repo, token);
  }

  // 2. Check if Repository is accessible / private
  onProgress("Checking repository access...");
  const repoCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoCheck.ok) {
    if (repoCheck.status === 404) {
      throw new Error(
        "Repository not found. If it's private, please add your GitHub Personal Access Token in Extensions Settings.",
      );
    }
    if (repoCheck.status === 403) {
      throw new Error("Access denied. Please check your GitHub Personal Access Token permissions.");
    }
    throw new Error(`GitHub API Error: ${repoCheck.statusText}`);
  }

  // 3. Handle Single File Download (Blob)
  if (type === "blob" && targetPath) {
    const fileName = path.basename(targetPath);
    const finalDest = path.join(destPath, fileName);

    onProgress(`Downloading file: ${fileName}...`);

    // Use raw.githubusercontent.com for public, or API for private
    // For private repos, raw.githubusercontent.com might need token? It's easier to use the API media type raw
    const rawUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}?ref=${ref}`;
    const fileHeaders = { ...headers, Accept: "application/vnd.github.v3.raw" };

    const response = await fetch(rawUrl, { headers: fileHeaders });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(finalDest, Buffer.from(buffer));

    return finalDest;
  }

  // 4. Handle Directory/Root Download (Tree) via Zip
  // Get Repo Metadata for size estimation
  let repoSizeMB = 0;
  try {
    const data = (await repoCheck.json()) as { size: number };
    repoSizeMB = Math.round(data.size / 1024);
  } catch {
    /* ignore */
  }

  const sizeMsg = repoSizeMB > 0 ? `~${repoSizeMB} MB` : "";
  onProgress(`Downloading archive ${sizeMsg}...`);

  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `${repo}-${Date.now()}.zip`);

  try {
    const response = await fetch(zipUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download archive: ${response.statusText}`);
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

        const canWrite = fileStream.write(Buffer.from(value));
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

    // 5. Extract
    onProgress("Extracting files...");

    // Determine extract destination
    const folderName = targetPath ? path.basename(targetPath) : repo;
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
          // GitHub archives usually start with "owner-repo-sha/"
          if (!rootFolder) {
            rootFolder = entry.fileName.split("/")[0] + "/";
          }

          const prefix = targetPath ? `${rootFolder}${targetPath}/` : rootFolder;

          if (entry.fileName.endsWith("/")) {
            zipfile.readEntry();
          } else {
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
              zipfile.readEntry();
            }
          }
        });

        zipfile.on("end", () => {
          if (extractedCount === 0) {
            reject(new Error(`No files found in '${targetPath || "repository"}'`));
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
