import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { KeyboardLayoutView } from "./components/KeyboardLayoutView";
import { TreeView } from "./components/TreeView";
import { useBetterAliasesTree } from "./hooks/useBetterAliasesTree";
import { getNodeAtPath } from "./lib/treeUtils";

type ViewMode = "tree" | "keyboard";

export default function ViewCheatsheetCommand() {
  const [viewMode, setViewMode] = useCachedState<ViewMode>("cheatsheet-view-mode", "keyboard");
  const [currentPath, setCurrentPath] = useState("");

  const tree = useBetterAliasesTree();
  const currentNode = currentPath ? getNodeAtPath(tree, currentPath) : tree;

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "tree" ? "keyboard" : "tree"));
  };

  if (!currentNode) {
    return <TreeView node={tree} onNavigate={handleNavigate} onToggleView={toggleViewMode} />;
  }

  if (viewMode === "keyboard") {
    return (
      <KeyboardLayoutView
        node={currentNode}
        onNavigate={handleNavigate}
        onToggleView={toggleViewMode}
        onGoBack={currentPath ? handleGoBack : undefined}
      />
    );
  }

  return (
    <TreeView
      node={currentNode}
      onNavigate={handleNavigate}
      onToggleView={toggleViewMode}
      onGoBack={currentPath ? handleGoBack : undefined}
    />
  );
}
