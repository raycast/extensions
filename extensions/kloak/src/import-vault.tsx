import React, { useState } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { requestDaemon } from "./kloak-ipc.js";

interface FileInfo {
  name: string;
  size: string;
  lines: number;
}

export default function ImportVaultCommand() {
  const [files, setFiles] = useState<string[]>([]);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [format, setFormat] = useState<string>("auto");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function detectFormat(filePath: string, text: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    const trimmed = text.trim();
    const firstLine = (trimmed.split("\n")[0] || "").toLowerCase();

    if (ext === ".1pif") return "1password-1pif";
    if (ext === ".1pux") return "1password-1pux";
    if (ext === ".xml" || trimmed.startsWith("<?xml") || trimmed.includes("<KeePassFile>")) return "keepass-xml";

    if (ext === ".json" || trimmed.startsWith("{") || trimmed.startsWith("[")) {
      if (basename.includes("bitwarden") || trimmed.includes('"encrypted"') || trimmed.includes('"folders"')) {
        return "bitwarden-json";
      }
      if (basename.includes("1password") || trimmed.includes('"accounts"') || trimmed.includes('"vaults"')) {
        return "1password-1pux";
      }
      return "bitwarden-json";
    }

    if (ext === ".csv" || firstLine.includes(",")) {
      if (basename.includes("apple") || (firstLine.includes("title") && firstLine.includes("otpauth"))) {
        return "apple-csv";
      }
      if (basename.includes("chrome") || (firstLine.includes("name") && firstLine.includes("url") && firstLine.includes("username") && firstLine.includes("password"))) {
        return "chrome-csv";
      }
      if (basename.includes("bitwarden") || firstLine.includes("folder,favorite,type,name")) {
        return "bitwarden-csv";
      }
      if (basename.includes("lastpass") || (firstLine.includes("fav") && firstLine.includes("grouping"))) {
        return "lastpass-csv";
      }
      if (basename.includes("proton") || firstLine.includes("create_time") || firstLine.includes("modify_time")) {
        return "proton-csv";
      }
      if (basename.includes("dashlane") || (firstLine.includes("domain") && firstLine.includes("otpsecret"))) {
        return "dashlane-csv";
      }
    }

    return "auto";
  }

  async function handleFilesChange(newFiles: string[]) {
    setFiles(newFiles);

    if (!newFiles || newFiles.length === 0) {
      setFileInfo(null);
      return;
    }

    const targetPath = newFiles[0];
    try {
      setIsLoading(true);
      const stat = await fs.stat(targetPath);
      const fileData = await fs.readFile(targetPath, "utf-8");
      const lineCount = fileData.split("\n").length;

      setFileInfo({
        name: path.basename(targetPath),
        size: formatBytes(stat.size),
        lines: lineCount,
      });

      setContent(fileData);

      const detected = detectFormat(targetPath, fileData);
      if (detected !== "auto") {
        setFormat(detected);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "File Loaded",
        message: `${path.basename(targetPath)} (${formatBytes(stat.size)})`,
      });
    } catch (err: any) {
      setFileInfo(null);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read file",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setFiles([]);
    setFileInfo(null);
    setContent("");
    setFormat("auto");
    showToast({ style: Toast.Style.Success, title: "Form Cleared" });
  }

  async function handleImport() {
    let importContent = content.trim();

    // If no content in state but a file is chosen, try reading it
    if (!importContent && files.length > 0) {
      try {
        setIsLoading(true);
        importContent = (await fs.readFile(files[0], "utf-8")).trim();
      } catch (err: any) {
        showToast({ style: Toast.Style.Failure, title: "Could not read file", message: err.message });
        setIsLoading(false);
        return;
      }
    }

    if (!importContent) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Data to Import",
        message: "Please choose a file or paste export data",
      });
      return;
    }

    try {
      setIsLoading(true);
      await showToast({ style: Toast.Style.Animated, title: "Importing credentials..." });

      const res = await requestDaemon("vault.import", {
        content: importContent,
        format,
      });

      const warningMessage = res.warnings?.length
        ? ` (${res.warnings.length} warning${res.warnings.length > 1 ? "s" : ""})`
        : "";

      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${res.imported} items!`,
        message: `Credentials added to your Kloak vault${warningMessage}`,
      });

      handleClear();
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: err.message || "Failed to import vault items",
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
          <Action.SubmitForm title="Run Import" icon={Icon.Download} onSubmit={handleImport} />
          {files.length > 0 && (
            <>
              <Action.ShowInFinder path={files[0]} title="Show File in Finder" />
              <Action.OpenWith path={files[0]} title="Open File With..." />
            </>
          )}
          <Action
            title="Clear Selection"
            icon={Icon.Trash}
            onAction={handleClear}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="filePicker"
        title="Import File"
        info="Select or drag-and-drop a CSV, JSON, XML, or 1PIF file exported from any password manager"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={files}
        onChange={handleFilesChange}
      />

      {fileInfo && (
        <Form.Description
          title="File Details"
          text={`📄 ${fileInfo.name}  •  ${fileInfo.size}  •  ${fileInfo.lines} lines`}
        />
      )}

      <Form.Dropdown
        id="format"
        title="Source Format"
        info="Select provider format or keep Auto-Detect to automatically identify CSV/JSON headers"
        value={format}
        onChange={setFormat}
      >
        <Form.Dropdown.Item value="auto" title="Auto-Detect (Recommended)" icon={Icon.Wand} />
        <Form.Dropdown.Section title="Popular Password Managers">
          <Form.Dropdown.Item value="apple-csv" title="Apple Passwords (CSV)" icon={Icon.Key} />
          <Form.Dropdown.Item value="bitwarden-json" title="Bitwarden (JSON)" icon={Icon.Lock} />
          <Form.Dropdown.Item value="bitwarden-csv" title="Bitwarden (CSV)" icon={Icon.Lock} />
          <Form.Dropdown.Item value="1password-1pux" title="1Password (.1pux JSON)" icon={Icon.Key} />
          <Form.Dropdown.Item value="1password-1pif" title="1Password (.1pif)" icon={Icon.Key} />
          <Form.Dropdown.Item value="chrome-csv" title="Chrome / Brave / Edge (CSV)" icon={Icon.Globe} />
          <Form.Dropdown.Item value="lastpass-csv" title="LastPass (CSV)" icon={Icon.Circle} />
          <Form.Dropdown.Item value="proton-csv" title="Proton Pass (CSV)" icon={Icon.Shield} />
          <Form.Dropdown.Item value="dashlane-csv" title="Dashlane (CSV)" icon={Icon.CheckCircle} />
          <Form.Dropdown.Item value="keepass-xml" title="KeePass (XML)" icon={Icon.Document} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="content"
        title="Raw Content"
        placeholder="Loaded automatically when selecting a file above, or paste raw CSV, JSON, or 1PIF content directly..."
        info="Shows loaded file contents or accepts direct pasted data"
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
