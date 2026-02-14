import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { promisify } from "util";
import { pipeline, Readable } from "stream";

const streamPipeline = promisify(pipeline);

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
    try {
      const destPath = values.downloadPath[0];
      await LocalStorage.setItem("lastDownloadPath", destPath);

      const result = await downloadGitHubDirectory(values.url, destPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Download Complete",
        message: `Saved to ${path.basename(result)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) {
      return "main"; // Fallback
    }
    const data = (await response.json()) as { default_branch: string };
    return data.default_branch || "main";
  } catch {
    return "main";
  }
}

async function downloadGitHubDirectory(url: string, destPath: string): Promise<string> {
  const { owner, repo, branch, dirPath } = parseGitHubUrl(url);

  const targetBranch = branch || (await getDefaultBranch(owner, repo));

  // Download zip
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${targetBranch}.zip`;
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `${repo}-${Date.now()}.zip`);

  try {
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`Failed to download repository: ${response.statusText}`);
    }

    if (!response.body) throw new Error("Empty response body");

    // Use Readable.fromWeb to convert Web Stream to Node Stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await streamPipeline(Readable.fromWeb(response.body as any), fs.createWriteStream(tempFile));

    // Extract
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
