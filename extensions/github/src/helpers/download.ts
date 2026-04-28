import fs from "fs";
import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import yauzl from "yauzl";

export interface ParsedUrl {
  owner: string;
  repo: string;
  type: "tree" | "blob" | "root";
  ref?: string; // branch or commit
  path?: string;
}

export function parseGitHubUrl(urlStr: string): ParsedUrl {
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

export async function downloadGitHubContent(
  url: string,
  destPath: string,
  token: string | null | undefined,
  onProgress: (message: string) => void,
): Promise<string> {
  const parsed = parseGitHubUrl(url);
  const { owner, repo, type } = parsed;
  let { ref } = parsed;
  const { path: targetPath } = parsed;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `token ${token}`;

  // 1. Check if Repository is accessible / private
  onProgress("Checking repository access...");
  const repoCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoCheck.ok) {
    if (repoCheck.status === 404) {
      throw new Error("Repository not found. Ensure you have the correct permissions.");
    }
    if (repoCheck.status === 403) {
      throw new Error("Access denied. Please check your GitHub token permissions.");
    }
    throw new Error(`GitHub API Error: ${repoCheck.statusText}`);
  }
  const repoData = (await repoCheck.json()) as { default_branch: string; size: number };
  if (!ref) ref = repoData.default_branch || "main";
  const repoSizeKB = repoData.size; // GitHub returns size in KB

  // 2. Handle Single File Download (Blob)
  if (type === "blob" && targetPath) {
    const fileName = path.basename(targetPath);
    const finalDest = path.join(destPath, fileName);

    onProgress(`Downloading file: ${fileName}...`);

    const rawUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}?ref=${ref}`;
    const fileHeaders = { ...headers, Accept: "application/vnd.github.v3.raw" };

    const response = await fetch(rawUrl, { headers: fileHeaders });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFile(finalDest, Buffer.from(buffer));

    return finalDest;
  }

  // 3. Handle Directory/Root Download (Tree) via Zip
  const repoSizeBytes = repoSizeKB * 1024;
  const repoSizeMB = (repoSizeBytes / (1024 * 1024)).toFixed(1);
  const sizeMsg = repoSizeBytes > 0 ? `~${repoSizeMB} MB` : "";
  onProgress(`Downloading archive ${sizeMsg}...`);

  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
  const tempDir = os.tmpdir();
  const safeRepo = repo.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempFile = path.join(tempDir, `${safeRepo}-${Date.now()}.zip`);

  try {
    const response = await fetch(zipUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download archive: ${response.statusText}`);
    }

    if (!response.body) throw new Error("Empty response body");

    const fileStream = fs.createWriteStream(tempFile);
    let downloadedBytes = 0;

    const reader = response.body.getReader();
    let isDone = false;
    while (!isDone) {
      const { done, value } = await reader.read();
      isDone = done;

      if (value) {
        downloadedBytes += value.length;
        const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);

        let progressMsg = `Downloading... ${downloadedMB} MB`;
        if (repoSizeBytes > 0) {
          const percent = Math.min(Math.round((downloadedBytes / repoSizeBytes) * 100), 100);
          progressMsg += ` / ${repoSizeMB} MB (${percent}%)`;
        }

        onProgress(progressMsg);
        fileStream.write(Buffer.from(value));
      }
    }

    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // 4. Extract
    onProgress("Extracting files...");

    const folderName = targetPath ? path.basename(targetPath) : repo;
    const finalDest = path.join(destPath, folderName);

    await mkdir(finalDest, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      yauzl.open(tempFile, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        let extractedCount = 0;
        let rootFolder = "";

        zipfile.readEntry();

        zipfile.on("entry", (entry) => {
          if (!rootFolder) {
            rootFolder = entry.fileName.split("/")[0] + "/";
          }

          const prefix = targetPath ? `${rootFolder}${targetPath}/` : rootFolder;

          if (entry.fileName.endsWith("/")) {
            zipfile.readEntry();
          } else {
            if (entry.fileName.startsWith(prefix)) {
              const relativePath = entry.fileName.substring(prefix.length);
              const entryDest = path.join(finalDest, relativePath);

              if (!entryDest.startsWith(finalDest + path.sep)) {
                zipfile.readEntry();
                return;
              }

              const entryDir = path.dirname(entryDest);

              mkdir(entryDir, { recursive: true })
                .then(() => {
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
                })
                .catch(reject);
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
