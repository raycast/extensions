import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NodeModuleService, NodeModulesItem } from "./utils/service";
import { useMemo, useState, useCallback, useRef } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { formatSize } from "./utils/format";
import { tryCatch } from "./utils/try-catch";

const execPromise = promisify(exec);

export type Preferences = {
  rootFolder: string;
  scanDepth: number;
};

interface NodeModulesListItemProps {
  item: NodeModulesItem;
  isDeleting: boolean;
  onDelete: (item: NodeModulesItem) => void;
  onGoToFolder: (path: string) => void;
}

function NodeModulesListItem({ item, isDeleting, onDelete, onGoToFolder }: NodeModulesListItemProps) {
  return (
    <List.Item
      key={item.id}
      title={item.title}
      accessories={[{ date: new Date(item.lastModified), tooltip: new Date(item.lastModified).toLocaleString() }]}
      subtitle={"Size: " + formatSize(item.size)}
      icon={isDeleting ? Icon.CircleProgress : Icon.Trash}
      actions={
        <ActionPanel>
          <Action
            title="Delete Node Modules"
            icon={isDeleting ? Icon.CircleProgress : Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onDelete(item)}
          />
          <Action title="Go to Parent Folder" icon={Icon.Finder} onAction={() => onGoToFolder(item.title)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [itemsToDeleteSet, setItemsToDeleteSet] = useState<Set<string>>(new Set());
  const [sortWith, setSortWith] = useState<"size" | "lastModified">("lastModified");
  const abortable = useRef<AbortController>();

  const {
    data: allItems,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (rootFolder: string, scanDepth: number) => {
      return NodeModuleService.getModules(rootFolder, scanDepth);
    },
    [preferences.rootFolder, preferences.scanDepth],
    {
      execute: !!preferences.rootFolder,
      keepPreviousData: true,
      abortable,
    },
  );

  const sortedItems = useMemo(() => {
    const itemsToDisplay = allItems || [];

    if (sortWith === "lastModified") {
      return [...itemsToDisplay].sort(
        (a: NodeModulesItem, b: NodeModulesItem) =>
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
      );
    }

    return [...itemsToDisplay].sort((a: NodeModulesItem, b: NodeModulesItem) => b.size - a.size);
  }, [allItems, sortWith]);

  const handleDelete = useCallback(
    async (moduleToDelete: NodeModulesItem) => {
      const hasConfirmed = await confirmAlert({
        title: "Do you really want to delete this node_modules folder?",
        rememberUserChoice: true,
        message: moduleToDelete.title, // Use moduleToDelete.title (path)
        icon: Icon.Trash,
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Delete",
        },
      });

      if (!hasConfirmed) {
        return await showToast({
          style: Toast.Style.Failure,
          title: "Deletion Cancelled",
          message: moduleToDelete.title,
        });
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting node_modules " + moduleToDelete.title,
      });

      // This is used to show the progress indicator until the deletion is complete
      setItemsToDeleteSet((prev) => {
        return new Set([...prev, moduleToDelete.id]);
      });

      const deletePromise = NodeModuleService.deleteModules([moduleToDelete], allItems || []);
      const { error } = await tryCatch(deletePromise);

      if (error) {
        console.error("Error calling NodeModuleService.deleteModules for " + moduleToDelete.title + ":", error);
        toast.style = Toast.Style.Failure;
        toast.title = "Deletion Operation Failed";
        toast.message = error instanceof Error ? error.message : String(error);
        return;
      }

      /*
          This is a hack to force the list to re-render without using revalidate
          Otherwise, the list will not update until we get the new data. 
          
          We could potentially use optimisticUpdate to hide item immediately, 
          but we want to show the progress indicator until the deletion is complete.
        */
      mutate(
        new Promise((resolve) => {
          resolve(true);
        }),
        {
          optimisticUpdate(data) {
            return data?.filter((item) => item.id !== moduleToDelete.id);
          },
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = "Deleted node_modules " + moduleToDelete.title;

      // The finally block for setItemsToDeleteSet is kept outside the tryCatch error handling
      // as it needs to run regardless of the outcome of the delete operation.
      setItemsToDeleteSet((prev) => {
        const next = new Set(prev);
        next.delete(moduleToDelete.id);
        return next;
      });
    },
    [allItems, mutate], // Removed revalidate as it's not used directly in this refactored version
  );

  const handleGoToFolder = useCallback(async (nodePath: string) => {
    const parentPath = path.dirname(nodePath);
    const openPromise = execPromise(`open "${path.join(parentPath)}"`);
    const { error } = await tryCatch(openPromise);

    if (error) {
      console.error("Error opening folder " + nodePath + ":", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed To Open Folder",
        message: nodePath + (error instanceof Error ? `\n${error.message}` : ""),
      });
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip={"Order By"} onChange={(value) => setSortWith(value as "size" | "lastModified")}>
          <List.Dropdown.Item title="Last Modified" value="lastModified" />
          <List.Dropdown.Item title="Size" value="size" />
        </List.Dropdown>
      }
    >
      {sortedItems.map((item) => (
        <NodeModulesListItem
          key={item.id}
          item={item}
          isDeleting={itemsToDeleteSet.has(item.id)}
          onDelete={handleDelete}
          onGoToFolder={handleGoToFolder}
        />
      ))}
    </List>
  );
}
