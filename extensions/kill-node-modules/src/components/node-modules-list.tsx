import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NodeModuleService, NodeModulesItem } from "../utils/service";
import { useMemo, useState, useCallback, useRef } from "react";
import path from "path";
import { formatSize } from "../utils/format";
import { tryCatch } from "../utils/try-catch";

interface NodeModulesListProps {
  rootFolder: string;
  useDeepScan: boolean;
  scanDepth?: number;
}

interface NodeModulesListItemProps {
  item: NodeModulesItem;
  isDeleting: boolean;
  onDelete: (item: NodeModulesItem) => void;
  onDeleteAll: () => void;
}

function NodeModulesListItem({ item, isDeleting, onDelete, onDeleteAll }: NodeModulesListItemProps) {
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
          <Action
            title="Delete All Node Modules"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onDeleteAll}
          />
          <Action.ShowInFinder title="Go to Parent Folder" path={path.dirname(item.title)} />
        </ActionPanel>
      }
    />
  );
}

export function NodeModulesList({ rootFolder, useDeepScan, scanDepth }: NodeModulesListProps) {
  const [itemsToDeleteSet, setItemsToDeleteSet] = useState<Set<string>>(new Set());
  const [sortWith, setSortWith] = useState<"size" | "lastModified">("lastModified");
  const abortable = useRef<AbortController | null>(null);

  const effectiveScanDepth = useDeepScan || scanDepth === -1 ? -1 : (scanDepth ?? 3);

  const {
    data: allItems,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (folder: string, depth: number) => {
      return NodeModuleService.getModules(folder, depth);
    },
    [rootFolder, effectiveScanDepth],
    {
      execute: !!rootFolder,
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

  const deleteModulesWithConfirmation = useCallback(
    async (modulesToDelete: NodeModulesItem[], confirmTitle: string, confirmMessage: string) => {
      const hasConfirmed = await confirmAlert({
        title: confirmTitle,
        rememberUserChoice: modulesToDelete.length === 1,
        message: confirmMessage,
        icon: Icon.Trash,
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: modulesToDelete.length === 1 ? "Delete" : "Delete All",
        },
      });

      if (!hasConfirmed) {
        return await showToast({
          style: Toast.Style.Failure,
          title: "Deletion Cancelled",
        });
      }

      const count = modulesToDelete.length;
      const toastTitle = count === 1 ? `Deleting ${modulesToDelete[0].title}` : `Deleting ${count} node_modules...`;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: toastTitle,
      });

      const idsToDelete = modulesToDelete.map((item) => item.id);
      setItemsToDeleteSet((prev) => new Set([...prev, ...idsToDelete]));

      const deletePromise = NodeModuleService.deleteModules(modulesToDelete, allItems || []);
      const { error } = await tryCatch(deletePromise);

      if (error) {
        console.error("Error deleting node_modules:", error);
        toast.style = Toast.Style.Failure;
        toast.title = "Deletion Operation Failed";
        toast.message = error instanceof Error ? error.message : String(error);
        setItemsToDeleteSet((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach((id) => next.delete(id));
          return next;
        });
        return;
      }

      const idsSet = new Set(idsToDelete);
      const updatedModules = (allItems || []).filter((item) => !idsSet.has(item.id));
      mutate(Promise.resolve(updatedModules), {
        optimisticUpdate(data) {
          return data?.filter((item) => !idsSet.has(item.id));
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = count === 1 ? `Deleted ${modulesToDelete[0].title}` : `Deleted ${count} node_modules`;

      setItemsToDeleteSet((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
    },
    [allItems, mutate],
  );

  const handleDelete = useCallback(
    (moduleToDelete: NodeModulesItem) => {
      return deleteModulesWithConfirmation(
        [moduleToDelete],
        "Do you really want to delete this node_modules folder?",
        moduleToDelete.title,
      );
    },
    [deleteModulesWithConfirmation],
  );

  const handleDeleteAll = useCallback(() => {
    if (!sortedItems || sortedItems.length === 0) {
      return showToast({
        style: Toast.Style.Failure,
        title: "No node_modules to delete",
      });
    }

    return deleteModulesWithConfirmation(
      sortedItems,
      `Delete all ${sortedItems.length} node_modules folders?`,
      "This action cannot be undone.",
    );
  }, [sortedItems, deleteModulesWithConfirmation]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Node Modules in ${path.basename(rootFolder)}`}
      searchBarAccessory={
        <List.Dropdown tooltip={"Order By"} onChange={(value) => setSortWith(value as "size" | "lastModified")}>
          <List.Dropdown.Item title="Last Modified" value="lastModified" />
          <List.Dropdown.Item title="Size" value="size" />
        </List.Dropdown>
      }
    >
      {sortedItems.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No node_modules Found"
          description={`No node_modules directories found in ${path.basename(rootFolder)}`}
          icon={Icon.Checkmark}
        />
      ) : (
        sortedItems.map((item) => (
          <NodeModulesListItem
            key={item.id}
            item={item}
            isDeleting={itemsToDeleteSet.has(item.id)}
            onDelete={handleDelete}
            onDeleteAll={handleDeleteAll}
          />
        ))
      )}
    </List>
  );
}
