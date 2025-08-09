import { Action, ActionPanel, Form, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { MarkdownParser, TreeFormatter } from "../utils";
import { ParsedTreeNode, TreeNode } from "../types";

interface MarkdownToTreeFormProps {
  onCopy?: () => void;
}

/**
 * Component for markdown to tree conversion with live preview
 */
export function MarkdownToTreeForm({ onCopy }: MarkdownToTreeFormProps) {
  const [markdownText, setMarkdownText] = useState(`- project
    - src
        - main.py
    - docs
        - README.md
- tests
    - test.py`);
  const [treePreview, setTreePreview] = useState("Enter markdown list above to see tree preview...");
  const [isValid, setIsValid] = useState(false);

  /**
   * Convert ParsedTreeNode to TreeNode format
   */
  const convertToTreeNode = (parsedNodes: ParsedTreeNode[], basePath = ""): TreeNode[] => {
    return parsedNodes.map((node) => {
      const path = basePath ? `${basePath}/${node.name}` : node.name;

      const treeNode: TreeNode = {
        name: node.name,
        path: path,
        isDirectory: node.isDirectory,
        depth: node.depth,
        children: node.children.length > 0 ? convertToTreeNode(node.children, path) : [],
      };

      return treeNode;
    });
  };

  // Update preview when markdown text changes
  useEffect(() => {
    if (!markdownText.trim()) {
      setTreePreview("Enter markdown list above to see tree preview...");
      setIsValid(false);
      return;
    }

    try {
      if (!MarkdownParser.isValidMarkdownList(markdownText)) {
        setTreePreview("❌ Invalid markdown list format. Please use proper list syntax with - or 1. etc.");
        setIsValid(false);
        return;
      }

      const parsedNodes = MarkdownParser.parseMarkdownList(markdownText);

      if (parsedNodes.length === 0) {
        setTreePreview("❌ No valid list items found.");
        setIsValid(false);
        return;
      }

      const treeNodes = convertToTreeNode(parsedNodes);

      const formatter = new TreeFormatter({
        useUnicode: true,
        showSizes: false,
        showCounts: false,
        indent: "    ",
      });

      const formatted = formatter.formatTree(treeNodes);
      setTreePreview(formatted);
      setIsValid(true);
    } catch (error) {
      setTreePreview(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsValid(false);
    }
  }, [markdownText]);

  const handleCopyToClipboard = async () => {
    if (!isValid || !treePreview || treePreview.startsWith("❌")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Copy",
        message: "Please enter valid markdown list first",
      });
      return;
    }

    try {
      await Clipboard.copy(treePreview);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied!",
        message: "Tree structure copied to clipboard",
      });
      onCopy?.();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: "Failed to copy to clipboard",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Copy Tree to Clipboard" onAction={handleCopyToClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert markdown list structure to directory tree format" />

      <Form.TextArea
        id="markdownInput"
        title="📝 Input"
        value={markdownText}
        onChange={setMarkdownText}
        info="Paste markdown list here. Use - or numbers with indentation. Items with children become folders."
      />

      <Form.TextArea
        id="treePreview"
        title="🌳 Preview"
        value={`${treePreview}\n`}
        onChange={() => {}} // Read-only
        info={
          isValid ? "✅ Ready to copy! Press Enter or click action." : "⚠️ Enter markdown list above to see preview"
        }
      />
    </Form>
  );
}
