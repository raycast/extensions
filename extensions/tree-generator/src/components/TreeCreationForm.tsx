import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, Detail, showToast, Toast, List, Icon } from "@raycast/api";
import { TreeCreationOptions } from "../types";
import { TreeParser, TreeCreator, ClipboardDetector, ClipboardTreeItem } from "../utils";

interface TreeCreationFormProps {
  initialOptions: TreeCreationOptions;
  onSubmit: (options: TreeCreationOptions, treeString: string) => void;
}

/**
 * Form component for tree creation options
 */
export function TreeCreationForm({ initialOptions, onSubmit }: TreeCreationFormProps) {
  const [rootPath, setRootPath] = useState<string[]>(initialOptions.rootPath ? [initialOptions.rootPath] : []);
  const [treeString, setTreeString] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(initialOptions.overwriteExisting);
  const [projectName, setProjectName] = useState(initialOptions.projectName || "");
  const [showPreview, setShowPreview] = useState(false);
  const [clipboardTrees, setClipboardTrees] = useState<ClipboardTreeItem[]>([]);
  const [showClipboardDetection, setShowClipboardDetection] = useState(false);

  // Load clipboard trees on component mount
  useEffect(() => {
    const loadClipboardTrees = async () => {
      try {
        const trees = await ClipboardDetector.searchClipboardForTrees();
        setClipboardTrees(trees);

        // If we found trees and the current tree string is empty, show the detection
        if (trees.length > 0 && !treeString.trim()) {
          setShowClipboardDetection(true);
        }
      } catch {
        // Silently fail - clipboard access might not be available
      }
    };

    loadClipboardTrees();
  }, []);

  const handleClipboardTreeSelect = (clipboardTree: ClipboardTreeItem) => {
    setTreeString(clipboardTree.content);
    setShowClipboardDetection(false);
    showToast({
      style: Toast.Style.Success,
      title: "Tree Loaded",
      message: `Loaded tree with ${clipboardTree.nodeCount} items from clipboard`,
    });
  };

  const handleLoadFromClipboard = async () => {
    try {
      const trees = await ClipboardDetector.searchClipboardForTrees();
      setClipboardTrees(trees);

      if (trees.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Trees Found",
          message: "No valid directory tree structures found in clipboard history",
        });
        return;
      }

      setShowClipboardDetection(true);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Access Failed",
        message: "Failed to access clipboard history",
      });
    }
  };

  const handleSubmit = async () => {
    if (!treeString.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Tree String",
        message: "Please enter a directory tree structure",
      });
      return;
    }

    if (!TreeParser.isValidTreeString(treeString)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Tree Format",
        message: "The input doesn't appear to be a valid directory tree structure",
      });
      return;
    }

    const selectedPath = rootPath.length > 0 ? rootPath[0] : initialOptions.rootPath;
    const options: TreeCreationOptions = {
      rootPath: selectedPath,
      overwriteExisting,
      projectName: projectName.trim() || undefined,
    };

    onSubmit(options, treeString);
  };

  const handlePreview = async () => {
    if (!treeString.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Tree String",
        message: "Please enter a directory tree structure to preview",
      });
      return;
    }

    if (!TreeParser.isValidTreeString(treeString)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Tree Format",
        message: "The input doesn't appear to be a valid directory tree structure",
      });
      return;
    }

    setShowPreview(true);
  };

  if (showClipboardDetection) {
    return (
      <ClipboardTreeSelection
        trees={clipboardTrees}
        onSelect={handleClipboardTreeSelect}
        onBack={() => setShowClipboardDetection(false)}
      />
    );
  }

  if (showPreview) {
    return (
      <TreePreview
        treeString={treeString}
        rootPath={Array.isArray(rootPath) ? rootPath[0] : rootPath || initialOptions.rootPath}
        onBack={() => setShowPreview(false)}
        onConfirm={handleSubmit}
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Files & Directories" onSubmit={handleSubmit} />
          <Action title="Preview Structure" onAction={handlePreview} />
          <Action title="Load from Clipboard" onAction={handleLoadFromClipboard} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create files and directories from a tree structure representation" />

      <Form.FilePicker
        id="rootPath"
        title="Root Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={rootPath}
        onChange={setRootPath}
        info="Select the directory where the file structure will be created. If not selected, current directory will be used."
      />

      <Form.TextField
        id="projectName"
        title="Project Name (Optional)"
        placeholder="my-new-project"
        value={projectName}
        onChange={setProjectName}
        info="If provided, creates a new folder with this name to contain the structure"
      />

      <Form.TextArea
        id="treeString"
        title="Directory Tree Structure"
        placeholder={`Enter your directory tree here, for example:
project/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── public/
│   └── index.html
└── package.json`}
        value={treeString}
        onChange={setTreeString}
        info="Paste or type the directory tree structure. Supports various tree formats with ├──, └──, or similar characters."
      />

      <Form.Checkbox
        id="overwriteExisting"
        title="Overwrite Existing Files"
        label="Overwrite files that already exist"
        value={overwriteExisting}
        onChange={setOverwriteExisting}
        info="If checked, existing files will be overwritten. Otherwise, they will be skipped."
      />
    </Form>
  );
}

interface TreePreviewProps {
  treeString: string;
  rootPath: string;
  onBack: () => void;
  onConfirm: () => void;
}

/**
 * Preview component to show what will be created
 */
function TreePreview({ treeString, rootPath, onBack, onConfirm }: TreePreviewProps) {
  const [previewData, setPreviewData] = useState<{
    directoriesToCreate: string[];
    filesToCreate: string[];
    existingPaths: string[];
    errors: string[];
  } | null>(null);

  useState(() => {
    const generatePreview = async () => {
      try {
        const nodes = TreeParser.parseTreeString(treeString);
        const validation = TreeCreator.validateTreeStructure(nodes);

        if (!validation.isValid) {
          setPreviewData({
            directoriesToCreate: [],
            filesToCreate: [],
            existingPaths: [],
            errors: validation.errors,
          });
          return;
        }

        const creator = new TreeCreator({
          rootPath,
          overwriteExisting: false,
        });

        const preview = await creator.previewCreation(nodes);
        setPreviewData({
          directoriesToCreate: preview.directoriesToCreate,
          filesToCreate: preview.filesToCreate,
          existingPaths: preview.existingPaths,
          errors: [],
        });
      } catch (error) {
        setPreviewData({
          directoriesToCreate: [],
          filesToCreate: [],
          existingPaths: [],
          errors: [`Preview generation failed: ${error}`],
        });
      }
    };

    generatePreview();
  });

  const generateMarkdown = (): string => {
    if (!previewData) {
      return "# Loading Preview...\n\nGenerating preview of files and directories to be created...";
    }

    if (previewData.errors.length > 0) {
      return `# ❌ Validation Errors\n\n${previewData.errors.map((error) => `- ${error}`).join("\n")}`;
    }

    const { directoriesToCreate, filesToCreate, existingPaths } = previewData;

    let markdown = `# 📁 Create Files from Tree Preview\n\n`;
    markdown += `**Root Directory:** \`${rootPath}\`\n\n`;

    if (directoriesToCreate.length > 0) {
      markdown += `## 📂 Directories to Create (${directoriesToCreate.length})\n\n`;
      directoriesToCreate.forEach((dir) => {
        markdown += `- \`${dir}\`\n`;
      });
      markdown += "\n";
    }

    if (filesToCreate.length > 0) {
      markdown += `## 📄 Files to Create (${filesToCreate.length})\n\n`;
      filesToCreate.forEach((file) => {
        markdown += `- \`${file}\`\n`;
      });
      markdown += "\n";
    }

    if (existingPaths.length > 0) {
      markdown += `## ⚠️ Already Exists (${existingPaths.length})\n\n`;
      existingPaths.forEach((path) => {
        markdown += `- \`${path}\`\n`;
      });
      markdown += "\n";
    }

    if (directoriesToCreate.length === 0 && filesToCreate.length === 0) {
      if (existingPaths.length > 0) {
        markdown += `## ℹ️ Nothing to Create\n\nAll files and directories already exist.`;
      } else {
        markdown += `## ℹ️ Nothing to Create\n\nNo valid files or directories found in the tree structure.`;
      }
    }

    return markdown;
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Create Structure" onAction={onConfirm} />
          <Action title="Back to Form" onAction={onBack} />
        </ActionPanel>
      }
    />
  );
}

interface ClipboardTreeSelectionProps {
  trees: ClipboardTreeItem[];
  onSelect: (tree: ClipboardTreeItem) => void;
  onBack: () => void;
}

/**
 * Component to select from clipboard tree items
 */
function ClipboardTreeSelection({ trees, onSelect, onBack }: ClipboardTreeSelectionProps) {
  return (
    <List>
      {trees.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No Trees Found"
          description="No valid directory tree structures found in clipboard history"
          actions={
            <ActionPanel>
              <Action title="Back to Form" onAction={onBack} />
            </ActionPanel>
          }
        />
      ) : (
        trees.map((tree, index) => (
          <List.Item
            key={index}
            icon={Icon.Tree}
            title={`Tree ${index + 1}`}
            subtitle={`${tree.directoryCount} dirs, ${tree.fileCount} files (${tree.nodeCount} total)`}
            accessories={[{ text: `Clipboard #${tree.offset + 1}` }]}
            detail={<List.Item.Detail markdown={`\`\`\`\n${tree.preview}\n\`\`\``} />}
            actions={
              <ActionPanel>
                <Action title="Use This Tree" onAction={() => onSelect(tree)} icon={Icon.Check} />
                <Action title="Back to Form" onAction={onBack} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
