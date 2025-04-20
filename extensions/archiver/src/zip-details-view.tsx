import { ActionPanel, Action, Icon, showToast, Toast, List, open as raycastOpen, showInFinder } from "@raycast/api";
import { useEffect, useState } from "react";
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import fs from "fs";
import { Blob } from "buffer";
import path from "path";
import { writeFile } from "fs/promises";
import os from "os";
import { ZipEntry, ZipFile } from "./common/types";
import { formatFileSize, getBreadcrumb, getFileIcon, getParentDirectory } from "./common/utils";
import { showFailureToast } from "@raycast/utils";

export default function ZipDetailsView(props: { filePath: string; password?: string | undefined }) {
  const { filePath, password } = props;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zipFile, setZipFile] = useState<ZipFile | null>(null);

  useEffect(() => {
    loadZipContents(filePath);
  }, [filePath]);

  const entries = getCurrentEntries();

  async function loadZipContents(filePath: string) {
    setIsLoading(true);
    const fileName = path.basename(filePath);
    const blob = new Blob([fs.readFileSync(filePath)]);
    const reader = new ZipReader(new BlobReader(blob as globalThis.Blob), { password });
    try {
      const zipEntries = await reader.getEntries();

      // Process entries to create a hierarchical structure
      const entries: ZipEntry[] = zipEntries.map((entry) => ({
        name: path.basename(entry.filename),
        isDirectory: entry.directory,
        size: entry.uncompressedSize,
        path: entry.filename,
        lastModDate: new Date(entry.lastModDate),
      }));

      setZipFile({
        fileName,
        fullPath: filePath,
        entries,
        currentDir: "",
      });

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      showFailureToast(error instanceof Error ? error : new Error("Failed to read ZIP file"));
    } finally {
      await reader.close();
    }
  }

  // Navigate to a directory inside the ZIP
  function navigateToDirectory(dirPath: string) {
    if (zipFile) {
      setZipFile({
        ...zipFile,
        currentDir: dirPath,
      });
    }
  }

  // Get entries for the current directory
  function getCurrentEntries(): ZipEntry[] {
    if (!zipFile) return [];

    const currentDir = zipFile.currentDir;
    // Get direct children of the current directory
    const entries = zipFile.entries.filter((entry) => {
      const relativePath = entry.path.replace(currentDir, "");
      // Exclude entry if it's the current directory
      if (relativePath === "") return false;

      // Check if it's a direct child (no additional slashes) or a directory with one trailing slash
      const parts = relativePath.split("/").filter((p) => p !== "");
      return parts.length === 1 || (parts.length === 0 && entry.isDirectory);
    });

    // Create directory entries for subdirectories
    const directorySet = new Set<string>();

    zipFile.entries.forEach((entry) => {
      if (entry.path.startsWith(currentDir) && entry.path !== currentDir) {
        const remainingPath = entry.path.slice(currentDir.length);
        const parts = remainingPath.split("/").filter((p) => p !== "");

        if (parts.length > 1) {
          // This is a nested file/directory, create a directory entry for its parent
          directorySet.add(parts[0]);
        }
      }
    });

    // Add directory entries that aren't already in the entries list
    directorySet.forEach((dirName) => {
      const dirPath = `${currentDir}${dirName}/`;
      if (!entries.find((e) => e.path === dirPath)) {
        entries.push({
          name: dirName,
          isDirectory: true,
          size: 0, // Directories don't have a size themselves
          path: dirPath,
          lastModDate: new Date(),
        });
      }
    });

    return entries;
  }

  async function previewFile(entry: ZipEntry) {
    try {
      if (!zipFile) {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: "No ZIP file loaded" });
        return;
      }
      await showToast({ style: Toast.Style.Animated, title: "Extracting to Temp..." });
      const tempDir = path.join(os.tmpdir(), "archiver-rc");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const outputPath = path.join(tempDir, entry.name);
      await extractZipFile(zipFile, entry, outputPath);
      await showToast({ style: Toast.Style.Success, title: "File Extracted", message: outputPath });
      await raycastOpen(outputPath);
    } catch (error) {
      console.error("Extraction error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Extraction Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function extractFile(entry: ZipEntry) {
    try {
      if (!zipFile) {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: "No ZIP file loaded" });
        return;
      }
      await showToast({ style: Toast.Style.Animated, title: "Extracting File..." });
      const tempDir = path.join(os.tmpdir(), "archiver-rc");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const downloadsDir = path.join(os.homedir(), "Downloads");
      const baseName = entry.name;
      const outputPath = getOutputFilePath(downloadsDir, baseName);
      await extractZipFile(zipFile, entry, outputPath);
      await showToast({ style: Toast.Style.Success, title: "File Extracted", message: outputPath });
      await showInFinder(outputPath);
    } catch (error) {
      console.error("Extraction error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Extraction Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Generate a unique output file path
  // by appending a number if the file already exists
  // e.g. "file (1).txt", "file (2).txt", etc.
  function getOutputFilePath(dir: string, baseName: string): string {
    let outputPath = path.join(dir, baseName);
    let counter = 1;
    const extName = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, extName);

    // Check if file already exists and generate new filename if needed
    while (fs.existsSync(outputPath)) {
      const newFileName = `${nameWithoutExt} (${counter})${extName}`;
      outputPath = path.join(dir, newFileName);
      counter++;
    }
    return outputPath;
  }

  async function extractZipFile(zipFile: ZipFile, entry: ZipEntry, outputPath: string) {
    // Re-open the zip file to read this specific entry
    const blob = new Blob([fs.readFileSync(zipFile.fullPath)]);
    const reader = new ZipReader(new BlobReader(blob as globalThis.Blob), { password });

    try {
      const entries = await reader.getEntries();

      // Find matching entry
      const zipEntry = entries.find((e) => e.filename === entry.path);

      if (!zipEntry || !zipEntry.getData) {
        showToast({ style: Toast.Style.Failure, title: "Error", message: "File not found in ZIP archive" });
        return;
      }

      const fileBlob = await zipEntry.getData?.(new BlobWriter());
      if (!fileBlob) {
        showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to get file blob" });
        return;
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(outputPath, buffer);

      await showToast({
        style: Toast.Style.Success,
        title: "File Extracted",
        message: outputPath,
        primaryAction: {
          title: "Open File",
          onAction: () => {
            raycastOpen(outputPath);
          },
        },
      });
    } finally {
      await reader.close();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search files..." navigationTitle={getBreadcrumb(zipFile)}>
      {zipFile?.currentDir && (
        <List.Item
          title=".."
          subtitle="Parent Directory"
          icon={Icon.ArrowUp}
          actions={
            <ActionPanel>
              <Action
                title="Go up"
                icon={Icon.ArrowUp}
                onAction={() => navigateToDirectory(getParentDirectory(zipFile))}
              />
            </ActionPanel>
          }
        />
      )}

      {entries
        .sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          // Alphabetically by name
          return a.name.localeCompare(b.name);
        })
        .map((entry) => (
          <List.Item
            key={entry.path}
            title={entry.name}
            subtitle={entry.isDirectory ? "Directory" : undefined}
            icon={entry.isDirectory ? Icon.Folder : getFileIcon(entry.name)}
            accessories={[
              {
                text: entry.isDirectory ? "" : formatFileSize(entry.size),
                tooltip: `Last modified: ${entry.lastModDate.toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                {entry.isDirectory ? (
                  <Action
                    title="Open Directory"
                    icon={Icon.Folder}
                    onAction={() => navigateToDirectory(`${zipFile?.currentDir}${entry.name}/`)}
                  />
                ) : (
                  <>
                    <Action title="Preview File" icon={Icon.Eye} onAction={() => previewFile(entry)} />
                    <Action title="Extract File" icon={Icon.Download} onAction={() => extractFile(entry)} />
                    <Action
                      title="View File Info"
                      icon={Icon.Info}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={() => {
                        showToast({
                          style: Toast.Style.Success,
                          title: entry.name,
                          message: `Size: ${formatFileSize(entry.size)}\nPath: ${
                            entry.path
                          }\nLast Modified: ${entry.lastModDate.toLocaleString()}`,
                        });
                      }}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
