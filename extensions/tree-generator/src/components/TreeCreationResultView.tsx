import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { TreeCreationResult } from "../types";

interface TreeCreationResultViewProps {
  result: TreeCreationResult;
  rootPath: string;
  onBack: () => void;
  onCreateAnother: () => void;
}

/**
 * Component to display tree creation results
 */
export function TreeCreationResultView({ result, rootPath, onBack, onCreateAnother }: TreeCreationResultViewProps) {
  const generateMarkdown = (): string => {
    const {
      directoriesCreated,
      filesCreated,
      itemsSkipped,
      creationTime,
      createdPaths,
      skippedPaths,
      hasErrors,
      errors,
    } = result;

    let markdown = `# ${hasErrors ? "⚠️" : "✅"} Tree Creation Result\n\n`;

    // Summary
    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Root Directory:** \`${rootPath}\`\n`;
    markdown += `- **Directories Created:** ${directoriesCreated}\n`;
    markdown += `- **Files Created:** ${filesCreated}\n`;
    markdown += `- **Items Skipped:** ${itemsSkipped}\n`;
    markdown += `- **Creation Time:** ${creationTime}ms\n\n`;

    // Errors (if any)
    if (hasErrors && errors.length > 0) {
      markdown += `## ❌ Errors\n\n`;
      errors.forEach((error) => {
        markdown += `- ${error}\n`;
      });
      markdown += "\n";
    }

    // Created items
    if (createdPaths.length > 0) {
      markdown += `## ✅ Created Items (${createdPaths.length})\n\n`;

      // Separate directories and files
      const createdDirs = createdPaths.filter((path) => {
        // Simple heuristic: if no extension and no dot in filename, likely a directory
        const name = path.split("/").pop() || "";
        return !name.includes(".") || name.startsWith(".");
      });

      const createdFiles = createdPaths.filter((path) => !createdDirs.includes(path));

      if (createdDirs.length > 0) {
        markdown += `### 📂 Directories\n`;
        createdDirs.forEach((dir) => {
          markdown += `- \`${dir}\`\n`;
        });
        markdown += "\n";
      }

      if (createdFiles.length > 0) {
        markdown += `### 📄 Files\n`;
        createdFiles.forEach((file) => {
          markdown += `- \`${file}\`\n`;
        });
        markdown += "\n";
      }
    }

    // Skipped items
    if (skippedPaths.length > 0) {
      markdown += `## ⏭️ Skipped Items (${skippedPaths.length})\n\n`;
      markdown += `_These items already existed and were not overwritten:_\n\n`;
      skippedPaths.forEach((path) => {
        markdown += `- \`${path}\`\n`;
      });
      markdown += "\n";
    }

    // Success message
    if (!hasErrors) {
      if (directoriesCreated > 0 || filesCreated > 0) {
        markdown += `## 🎉 Success!\n\n`;
        markdown += `Your directory structure has been successfully created. `;
        if (itemsSkipped > 0) {
          markdown += `${itemsSkipped} item(s) were skipped because they already existed.`;
        }
      } else {
        markdown += `## ℹ️ No Items Created\n\n`;
        markdown += `All specified files and directories already exist.`;
      }
    }

    return markdown;
  };

  const handleCopyPaths = async () => {
    const allPaths = [...result.createdPaths, ...result.skippedPaths].join("\n");

    try {
      await navigator.clipboard.writeText(allPaths);
      await showToast({
        style: Toast.Style.Success,
        title: "Paths Copied",
        message: "All file paths have been copied to clipboard",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: "Could not copy paths to clipboard",
      });
    }
  };

  const handleOpenInFinder = async () => {
    try {
      // Use the open command to reveal the root directory in Finder (macOS)
      exec(`open "${rootPath}"`);

      await showToast({
        style: Toast.Style.Success,
        title: "Directory Opened",
        message: "Root directory opened in Finder",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Open Failed",
        message: "Could not open directory in Finder",
      });
    }
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Create Another Structure" onAction={onCreateAnother} />
          <Action title="Back to Form" onAction={onBack} />
          <Action title="Copy All Paths" onAction={handleCopyPaths} />
          <Action title="Open in Finder" onAction={handleOpenInFinder} />
        </ActionPanel>
      }
    />
  );
}
