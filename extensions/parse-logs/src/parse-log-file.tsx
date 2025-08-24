import {
  ActionPanel,
  Action,
  Detail,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
  Clipboard,
  showHUD,
  Icon,
} from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, basename, extname, dirname } from "path";
import { existsSync } from "fs";

interface Preferences {
  defaultSearchQuery: string;
  defaultFolderPath: string;
  fileExtensions: string;
}

interface ParsedLogResult {
  originalFile: string;
  newFile: string;
  content: string;
  matchCount: number;
  searchQuery: string;
}

interface FormValues {
  searchQuery: string;
  selectedFile?: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [defaultFile, setDefaultFile] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Find the default (most recent) file on component mount
  useEffect(() => {
    async function findDefaultFile() {
      try {
        const mostRecentFile = await getMostRecentFile(preferences.defaultFolderPath, preferences.fileExtensions);
        setDefaultFile(basename(mostRecentFile));
      } catch {
        setDefaultFile("No matching files found");
      }
    }

    if (preferences.defaultFolderPath && preferences.fileExtensions) {
      findDefaultFile();
    }
  }, [preferences.defaultFolderPath, preferences.fileExtensions]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const { searchQuery, selectedFile } = values;

      if (!searchQuery.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Search query cannot be empty",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Processing...",
        message: "Finding and parsing log files",
      });

      try {
        const result = await parseLogFiles(
          preferences.defaultFolderPath,
          searchQuery,
          preferences.fileExtensions,
          selectedFile && selectedFile.length > 0 ? selectedFile[0] : undefined,
        );

        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = `Found ${result.matchCount} matching lines`;

        push(<LogResultView result={result} />);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
    [preferences.defaultFolderPath, preferences.fileExtensions, push],
  );

  // Check if a file is selected
  const hasSelectedFile = selectedFiles.length > 0;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Logs" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="searchQuery"
        title="Search Query"
        placeholder="Enter search term to find in log files"
        defaultValue={preferences.defaultSearchQuery || ""}
      />
      <Form.FilePicker
        id="selectedFile"
        title="Select Specific File (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        // File type filtering is done in the file picker's native dialog
        value={selectedFiles}
        onChange={setSelectedFiles}
      />
      {!hasSelectedFile && defaultFile && <Form.Description title="Default File" text={defaultFile} />}
    </Form>
  );
}

async function getMostRecentFile(folderPath: string, fileExtensions: string): Promise<string> {
  if (!existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  // Parse the file extensions from preferences
  const allowedExtensions = fileExtensions
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 0)
    .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));

  if (allowedExtensions.length === 0) {
    throw new Error("No file extensions specified in preferences");
  }

  // Get all files in the directory
  const files = await readdir(folderPath);

  // Filter for files with the specified extensions
  const logFiles = files.filter((file) => {
    const ext = extname(file).toLowerCase();
    return allowedExtensions.includes(ext);
  });

  if (logFiles.length === 0) {
    throw new Error(`No files found with extensions: ${allowedExtensions.join(", ")}`);
  }

  // Find the most recent log file
  let mostRecentFile = "";
  let mostRecentTime = 0;

  for (const file of logFiles) {
    const filePath = join(folderPath, file);
    const stats = await stat(filePath);

    if (stats.mtime.getTime() > mostRecentTime) {
      mostRecentTime = stats.mtime.getTime();
      mostRecentFile = file;
    }
  }

  return join(folderPath, mostRecentFile);
}

async function parseLogFiles(
  folderPath: string,
  searchQuery: string,
  fileExtensions: string,
  specificFile?: string,
): Promise<ParsedLogResult> {
  let targetFile: string;

  if (specificFile) {
    // Use the specifically selected file
    if (!existsSync(specificFile)) {
      throw new Error(`Selected file does not exist: ${specificFile}`);
    }
    targetFile = specificFile;
  } else {
    // Use the existing logic to find the most recent file
    targetFile = await getMostRecentFile(folderPath, fileExtensions);
  }

  // Read the file content
  const content = await readFile(targetFile, "utf-8");
  const lines = content.split("\n");

  // Filter lines containing the search query
  const matchingLines = lines.filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()));

  if (matchingLines.length === 0) {
    throw new Error(`No lines found containing "${searchQuery}"`);
  }

  // Create new file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = basename(targetFile, extname(targetFile));
  const outputDir = dirname(targetFile);
  const newFileName = `${baseName}_parsed_${timestamp}.log`;
  const newFilePath = join(outputDir, newFileName);

  // Write filtered content to new file
  const filteredContent = matchingLines.join("\n");
  await writeFile(newFilePath, filteredContent, "utf-8");

  return {
    originalFile: targetFile,
    newFile: newFilePath,
    content: filteredContent,
    matchCount: matchingLines.length,
    searchQuery,
  };
}

function LogResultView({ result }: { result: ParsedLogResult }) {
  const { pop } = useNavigation();

  const copyFile = useCallback(async () => {
    try {
      await Clipboard.copy({ file: result.newFile });
      showHUD("File copied to clipboard");
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to copy file",
      });
    }
  }, [result.newFile]);

  const copyFileContents = useCallback(async () => {
    await Clipboard.copy(result.content);
    showHUD("File contents copied to clipboard");
  }, [result.content]);

  const copyFileName = useCallback(async () => {
    await Clipboard.copy(basename(result.newFile));
    showHUD("File name copied to clipboard");
  }, [result.newFile]);

  const copyFilePath = useCallback(async () => {
    await Clipboard.copy(result.newFile);
    showHUD("File path copied to clipboard");
  }, [result.newFile]);

  const markdown = `# Filtered Log Content

\`\`\`
${result.content}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Log Parse Results"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Search Query" text={result.searchQuery} />
          <Detail.Metadata.Label title="Matches Found" text={result.matchCount.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Original File" text={basename(result.originalFile)} />
          <Detail.Metadata.Label title="New File" text={basename(result.newFile)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open Folder"
            target={`file://${result.newFile.replace(basename(result.newFile), "")}`}
            text="Show in Finder"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="File Actions">
            <Action
              title="Copy File"
              icon={Icon.Clipboard}
              onAction={copyFile}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy File Contents"
              icon={Icon.Document}
              onAction={copyFileContents}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Copy File Name"
              icon={Icon.Tag}
              onAction={copyFileName}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Copy File Path"
              icon={Icon.Folder}
              onAction={copyFilePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action.ShowInFinder path={result.newFile} />
            <Action.Open target={result.newFile} title="Open File" />
            <Action
              title="Back to Search"
              icon={Icon.ArrowLeft}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
