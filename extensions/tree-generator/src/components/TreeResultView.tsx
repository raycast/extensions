import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { TreeGenerationResult } from "../types";
import { FileSystemUtils, DirectoryUtils } from "../utils";

interface TreeResultViewProps {
  result: TreeGenerationResult;
  rootPath: string;
  onBack: () => void;
  onRegenerate: () => void;
}

/**
 * Component to display the generated directory tree
 */
export function TreeResultView({ result, rootPath, onBack, onRegenerate }: TreeResultViewProps) {
  const displayPath = DirectoryUtils.formatPathForDisplay(rootPath);

  // Prepare error/warning information
  const warningMessage =
    result.hasErrors && result.skippedCount > 0
      ? `\n> ⚠️ **Warning:** ${result.skippedCount} item(s) were skipped due to permission errors.\n`
      : "";

  const markdown = `# Directory Tree

**Root Path:** \`${displayPath}\`
${warningMessage}
\`\`\`
${result.treeString}
\`\`\`

## Statistics

- **Files:** ${result.fileCount}
- **Directories:** ${result.dirCount}
- **Total Size:** ${FileSystemUtils.formatSize(result.totalSize)}
- **Generation Time:** ${result.generationTime}ms${result.hasErrors ? `\n- **Skipped Items:** ${result.skippedCount}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Tree to Clipboard" content={result.treeString} />
          <Action
            icon={Icon.ArrowLeft}
            title="Back to Options"
            onAction={onBack}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <Action
            icon={Icon.Repeat}
            title="Regenerate Tree"
            onAction={onRegenerate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            icon={Icon.Document}
            title="Copy Full Report"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Root Directory" text={displayPath} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Files" text={result.fileCount.toString()} />
          <Detail.Metadata.Label title="Total Directories" text={result.dirCount.toString()} />
          <Detail.Metadata.Label title="Total Size" text={FileSystemUtils.formatSize(result.totalSize)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Generation Time" text={`${result.generationTime}ms`} />
          {result.hasErrors && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Skipped Items" text={result.skippedCount.toString()} icon="⚠️" />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
