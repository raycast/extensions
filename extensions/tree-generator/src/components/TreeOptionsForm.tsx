import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { TreeGeneratorOptions } from "../types";
import { DirectoryUtils, PreferenceUtils } from "../utils";

interface TreeOptionsFormProps {
  initialOptions: TreeGeneratorOptions;
  onSubmit: (options: TreeGeneratorOptions) => Promise<void>;
  isInitializing?: boolean;
}

/**
 * Form component for configuring tree generation options
 */
export function TreeOptionsForm({ initialOptions, onSubmit, isInitializing = false }: TreeOptionsFormProps) {
  const [options, setOptions] = useState<TreeGeneratorOptions>(initialOptions);
  const [isLoading, setIsLoading] = useState(false);

  // Update options when initialOptions change
  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  const handleSubmit = async () => {
    if (options.maxDepth < 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Depth",
        message: "Maximum depth must be at least 1",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(options);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentDirectory = async () => {
    try {
      const currentDir = await DirectoryUtils.getCurrentDirectory();
      setOptions((prev) => ({ ...prev, rootPath: currentDir }));
      await showToast({
        style: Toast.Style.Success,
        title: "Directory Updated",
        message: `Using: ${DirectoryUtils.formatPathForDisplay(currentDir)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Get Directory",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleResetIgnorePatterns = () => {
    const defaultPatterns = PreferenceUtils.getDefaultGenerateTreeIgnorePatterns();
    setOptions((prev) => ({ ...prev, ignorePatterns: defaultPatterns }));
    showToast({
      style: Toast.Style.Success,
      title: "Reset to Default",
      message: "Ignore patterns reset to Generate Tree preference defaults",
    });
  };

  return (
    <Form
      isLoading={isLoading || isInitializing}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Tree} title="Generate Tree" onSubmit={handleSubmit} />
          <Action
            icon={Icon.Folder}
            title="Refresh Current Directory"
            onAction={handleUseCurrentDirectory}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            icon={Icon.RotateAntiClockwise}
            title="Reset Ignore Patterns to Default"
            onAction={handleResetIgnorePatterns}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rootPath"
        title="Root Directory"
        placeholder="Directory path"
        value={DirectoryUtils.formatPathForDisplay(options.rootPath)}
        onChange={(value) => {
          // Expand ~ to home directory if needed
          const expandedPath = value.startsWith("~") ? value.replace("~", homedir()) : value;
          setOptions((prev) => ({ ...prev, rootPath: expandedPath }));
        }}
        info="The directory to generate the tree from. Use Cmd+Shift+R to refresh current directory."
      />

      <Form.Separator />

      <Form.TextField
        id="maxDepth"
        title="Maximum Depth"
        placeholder="Enter maximum traversal depth"
        value={options.maxDepth.toString()}
        onChange={(value) => {
          const depth = parseInt(value) || 1;
          setOptions((prev) => ({ ...prev, maxDepth: Math.max(1, depth) }));
        }}
        info="How many levels deep to traverse (minimum: 1)"
      />

      <Form.Separator />

      <Form.Checkbox
        id="respectGitignore"
        title="Respect .gitignore"
        label="Ignore files and directories listed in .gitignore"
        value={options.respectGitignore}
        onChange={(value) => setOptions((prev) => ({ ...prev, respectGitignore: value }))}
      />

      <Form.Checkbox
        id="showHidden"
        title="Show Hidden Files"
        label="Include hidden files and directories (starting with .)"
        value={options.showHidden}
        onChange={(value) => setOptions((prev) => ({ ...prev, showHidden: value }))}
      />

      <Form.Checkbox
        id="directoriesOnly"
        title="Directories Only"
        label="Show only directories, exclude files"
        value={options.directoriesOnly}
        onChange={(value) => setOptions((prev) => ({ ...prev, directoriesOnly: value }))}
      />

      <Form.Checkbox
        id="showSizes"
        title="Show File Sizes"
        label="Display file sizes in human-readable format"
        value={options.showSizes}
        onChange={(value) => setOptions((prev) => ({ ...prev, showSizes: value }))}
      />

      <Form.Checkbox
        id="showCounts"
        title="Show Directory Counts"
        label="Display file and directory counts for each directory"
        value={options.showCounts}
        onChange={(value) => setOptions((prev) => ({ ...prev, showCounts: value }))}
      />

      <Form.Separator />

      <Form.TextArea
        id="ignorePatterns"
        title="Custom Ignore Patterns"
        placeholder={`Enter patterns to ignore (one per line)
Example:
*.log
node_modules
dist`}
        value={options.ignorePatterns.join("\n")}
        onChange={(value) => {
          const patterns = value
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          setOptions((prev) => ({ ...prev, ignorePatterns: patterns }));
        }}
        info="Glob patterns to ignore (supports * wildcards). Default patterns can be configured in extension preferences. Use Cmd+Shift+D to reset to preference defaults."
      />
    </Form>
  );
}
