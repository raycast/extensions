import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { type AliasNode, isLeafNode } from "../lib/treeUtils";

interface TreeViewProps {
  node: AliasNode;
  onNavigate: (path: string) => void;
  onToggleView: () => void;
  onGoBack?: () => void;
}

export function TreeView({ node, onNavigate, onToggleView, onGoBack }: TreeViewProps) {
  const childEntries = Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b));

  return (
    <List navigationTitle={node.fullAlias ? `Aliases > ${node.fullAlias}` : "Aliases Cheatsheet"}>
      {childEntries.length === 0 && (
        <List.EmptyView
          icon={Icon.Info}
          title="No aliases configured"
          description="Create aliases using the 'Create Alias' command"
        />
      )}
      {childEntries.map(([key, childNode]) => {
        const isLeaf = isLeafNode(childNode);
        const hasChildren = Object.keys(childNode.children).length > 0;

        return (
          <List.Item
            key={childNode.fullAlias}
            title={key}
            subtitle={childNode.label || (isLeaf ? childNode.value : undefined)}
            icon={hasChildren ? Icon.Folder : getAliasIcon(childNode.value)}
            accessories={[
              ...(isLeaf && childNode.value
                ? [
                    {
                      text: childNode.value,
                      tooltip: "Command",
                    },
                  ]
                : []),
              ...(hasChildren
                ? [
                    {
                      icon: Icon.ChevronRight,
                      tooltip: "Navigate into folder",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                {hasChildren && (
                  <Action title="Navigate" icon={Icon.ChevronRight} onAction={() => onNavigate(childNode.fullAlias)} />
                )}
                <Action
                  title="Switch to Keyboard View"
                  icon={Icon.Desktop}
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getAliasIcon(value?: string): Icon {
  if (!value) return Icon.Terminal;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return Icon.Globe;
  }

  if (value.endsWith(".app") || value.includes("/Applications/")) {
    return Icon.AppWindow;
  }

  return Icon.Terminal;
}
