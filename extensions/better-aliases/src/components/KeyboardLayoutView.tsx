import { Action, ActionPanel, Detail, environment, Icon, type Keyboard } from "@raycast/api";
import { type AliasNode, isLeafNode } from "../lib/treeUtils";
import { generateKeyboardSvg, svgToDataUri } from "./KeyboardSvg";

interface KeyboardLayoutViewProps {
  node: AliasNode;
  onNavigate: (path: string) => void;
  onToggleView: () => void;
  onGoBack?: () => void;
}

export interface KeyboardColors {
  background: string;
  keyBackground: string;
  keyStroke: string;
  keyText: string;
  prefix: string; // Folder color
  complete: string; // Action color
  both: string; // Both color
}

const VALID_SHORTCUT_KEYS = new Set([
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  ",",
  "/",
  ";",
  "'",
  "[",
  "]",
  "\\",
  "-",
  "=",
  "`",
]);

export function KeyboardLayoutView({ node, onNavigate, onToggleView, onGoBack }: KeyboardLayoutViewProps) {
  const isDark = environment.appearance === "dark";

  const colors: KeyboardColors = {
    background: isDark ? "#151515" : "#F5F5F5",
    keyBackground: isDark ? "#202123" : "#FFFFFF",
    keyStroke: isDark ? "#333333" : "#E0E0E0",
    keyText: "#FF6363",
    prefix: "#FF6363", // Red for folders
    complete: isDark ? "#FFFFFF" : "#111111", // Action color
    both: "#FF6363",
  };

  const svg = generateKeyboardSvg(node, colors);
  const dataUri = svgToDataUri(svg);

  const makeIcon = (color: string) =>
    svgToDataUri(
      `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="4" fill="${color}" stroke="${colors.keyStroke}" stroke-width="1"/></svg>`,
    );

  const folderIcon = makeIcon(colors.prefix);
  const actionIcon = makeIcon(colors.complete);
  const emptyIcon = makeIcon(colors.keyBackground);

  const childEntries = Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b));

  let legendMarkdown = "## Available Keys\n\n";
  if (childEntries.length === 0) {
    legendMarkdown += "_No aliases configured for this path._\n";
  } else {
    legendMarkdown += "| Key | Type | Label | Value |\n";
    legendMarkdown += "|:---|:---|:---|:---|\n";

    for (const [key, childNode] of childEntries) {
      const isLeaf = isLeafNode(childNode);
      const hasChildren = Object.keys(childNode.children).length > 0;

      let type = "Unknown";
      if (isLeaf && hasChildren) {
        type = "Both";
      } else if (hasChildren) {
        type = "Folder";
      } else if (isLeaf) {
        type = "Action";
      }

      const label = childNode.label || "-";
      const value = childNode.value || "-";

      legendMarkdown += `| **${key.toUpperCase()}** | ${type} | ${label} | ${value} |\n`;
    }
  }

  const markdown = `
# Keyboard Layout View

![Keyboard Layout](${dataUri})

${node.fullAlias ? `**Current Path:** \`${node.fullAlias}\`` : "**Current Path:** Root"}

_Press the key to change the path_

- ![](${folderIcon}) **Multiple Actions**: Leads to more keys
- ![](${actionIcon}) **Action**: Final snippet or command
- ![](${emptyIcon}) **Empty Key**: No action assigned

---

${legendMarkdown}
  `.trim();

  return (
    <Detail
      markdown={markdown}
      navigationTitle={node.fullAlias ? `Keyboard > ${node.fullAlias}` : "Keyboard Layout"}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View Options">
            <Action
              title="Switch to Tree View"
              icon={Icon.List}
              onAction={onToggleView}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
            {onGoBack && (
              <Action
                title="Go Back"
                icon={Icon.ArrowLeft}
                onAction={onGoBack}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            {childEntries.map(([key, childNode]) => {
              const char = key.toLowerCase();
              if (!VALID_SHORTCUT_KEYS.has(char)) return null;

              const hasChildren = Object.keys(childNode.children).length > 0;

              return (
                <Action
                  key={childNode.fullAlias}
                  title={hasChildren ? `Navigate to "${key.toUpperCase()}"` : `Alias: ${key.toUpperCase()}`}
                  icon={hasChildren ? Icon.ChevronRight : Icon.Terminal}
                  onAction={() => {
                    if (hasChildren) {
                      onNavigate(childNode.fullAlias);
                    }
                  }}
                  shortcut={{ modifiers: [], key: char as Keyboard.KeyEquivalent }}
                />
              );
            })}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
