import { ActionPanel, Action, List, Icon, showHUD, showToast, Toast, popToRoot, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { existsSync } from "fs";
import { basename, join } from "path";
import { ShelfItem } from "./lib/types";
import { clearShelf, getShelfItems, updateShelfItems } from "./lib/shelf-storage";
import { moveItems, ConflictStrategy, validateSourceItems } from "./lib/file-operations";
import { keepShelfAfterCompletion } from "./lib/preferences";
import { getFinderDestination } from "./lib/finder-destination";

export default function Command() {
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staleResolved, setStaleResolved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const shelfItems = await getShelfItems();
      setItems(shelfItems);

      const destinationResult = await getFinderDestination();
      if ("path" in destinationResult) {
        setDestination(destinationResult.path);
      } else {
        setDestinationError(destinationResult.error);
      }

      setIsLoading(false);
    };

    load();
  }, []);

  const validation = useMemo(() => validateSourceItems(items), [items]);
  const staleItems = validation.stale;

  const handleMoveWithStrategy = async (onConflict: ConflictStrategy) => {
    if (!destination || items.length === 0) return;

    const freshValidation = validateSourceItems(items);
    if (freshValidation.hasIssues) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Some items are no longer available",
        message: "Remove stale items from the shelf and try again.",
      });
      return;
    }

    const results = moveItems(freshValidation.valid, destination, { onConflict });
    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failCount = results.filter((r) => !r.success && !r.skipped).length;

    if (successCount > 0) {
      const movedPathsById = new Map<string, string>();
      for (const r of results) {
        if (r.success && r.newPath) movedPathsById.set(r.item.id, r.newPath);
      }

      const fullySuccessful = failCount === 0 && skippedCount === 0;

      if (fullySuccessful && !keepShelfAfterCompletion()) {
        await clearShelf();
      } else if (keepShelfAfterCompletion()) {
        const updated = items.map((item) => {
          const newPath = movedPathsById.get(item.id);
          if (!newPath) return item;
          return { ...item, path: newPath, name: basename(newPath) };
        });
        await updateShelfItems(updated);
      } else {
        const remaining = items.filter((item) => !movedPathsById.has(item.id));
        await updateShelfItems(remaining);
      }
    }

    if (failCount > 0 || skippedCount > 0) {
      const parts = [`Moved ${successCount} item${successCount !== 1 ? "s" : ""}`];
      if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
      if (failCount > 0) parts.push(`${failCount} failed`);
      await showHUD(parts.join(", "));
    } else {
      await showHUD(`Moved ${successCount} item${successCount !== 1 ? "s" : ""}`);
    }

    await popToRoot();
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (items.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tray}
          title="Shelf is Empty"
          description="Add items to the shelf first using 'Add to Shelf'"
        />
      </List>
    );
  }

  if (destinationError) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="No Destination Selected" description={destinationError} />
      </List>
    );
  }

  if (validation.hasIssues && !staleResolved) {
    return (
      <List navigationTitle="Stale Items Found">
        <List.Section title={`${staleItems.length} item${staleItems.length !== 1 ? "s" : ""} missing or inaccessible`}>
          <List.Item
            icon={Icon.Trash}
            title="Remove Stale Items"
            subtitle="Clean shelf and continue"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Remove Stale Items"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await updateShelfItems(validation.valid);
                    setItems(validation.valid);
                    setStaleResolved(true);
                    await showHUD("Removed stale items");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.XMarkCircle}
            title="Cancel"
            subtitle="Go back without moving"
            actions={
              <ActionPanel>
                <Action icon={Icon.XMarkCircle} title="Cancel" onAction={popToRoot} />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.Section title="Stale Items">
          {staleItems.slice(0, 20).map((item) => (
            <List.Item key={`stale-${item.id}`} icon={Icon.Warning} title={item.name} subtitle={item.path} />
          ))}
          {staleItems.length > 20 && <List.Item icon={Icon.Ellipsis} title={`And ${staleItems.length - 20} more...`} />}
        </List.Section>
      </List>
    );
  }

  const conflicts = destination ? items.filter((item) => existsSync(join(destination, item.name))) : [];

  // Show conflict resolution screen if there are conflicts
  if (conflicts.length > 0) {
    return (
      <List navigationTitle="Resolve Conflicts">
        <List.Section
          title={`${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""} found`}
          subtitle={`Destination: ${destination}`}
        >
          <List.Item
            icon={{ source: Icon.Forward, tintColor: Color.Blue }}
            title="Skip Conflicts"
            subtitle="Keep existing files, only move non-conflicting items"
            accessories={[{ text: `${items.length - conflicts.length} will move` }]}
            actions={
              <ActionPanel>
                <Action icon={Icon.Forward} title="Skip Conflicts" onAction={() => handleMoveWithStrategy("skip")} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{ source: Icon.Replace, tintColor: Color.Orange }}
            title="Replace Conflicts"
            subtitle="Overwrite existing files with shelf items"
            accessories={[{ text: `${items.length} will move` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Replace}
                  title="Replace Conflicts"
                  style={Action.Style.Destructive}
                  onAction={() => handleMoveWithStrategy("replace")}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
            title="Auto-Rename"
            subtitle="Keep both and add a suffix (e.g., file (1).txt)"
            accessories={[{ text: `${items.length} will move` }]}
            actions={
              <ActionPanel>
                <Action icon={Icon.PlusCircle} title="Auto-Rename" onAction={() => handleMoveWithStrategy("rename")} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Cancel"
            subtitle="Go back without moving"
            actions={
              <ActionPanel>
                <Action icon={Icon.XMarkCircle} title="Cancel" onAction={popToRoot} />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.Section title="Conflicting Items">
          {conflicts.slice(0, 20).map((item) => (
            <List.Item key={`conflict-${item.id}`} icon={Icon.Warning} title={item.name} subtitle={item.path} />
          ))}
          {conflicts.length > 20 && <List.Item icon={Icon.Ellipsis} title={`And ${conflicts.length - 20} more...`} />}
        </List.Section>
      </List>
    );
  }

  // No conflicts — show simple confirmation with warning
  return (
    <List
      navigationTitle="Confirm Move"
      searchBarPlaceholder={`${items.length} item${items.length > 1 ? "s" : ""} will be moved`}
    >
      <List.Section title={`Destination: ${destination}`}>
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="Confirm Move"
          subtitle="Files will be removed from their original locations"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRightCircle}
                title="Move Items"
                style={Action.Style.Destructive}
                onAction={() => handleMoveWithStrategy("skip")}
              />
              <Action
                icon={Icon.XMarkCircle}
                title="Cancel"
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={popToRoot}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Items to Move">
        {items.map((item) => (
          <List.Item
            key={item.id}
            icon={item.type === "folder" ? Icon.Folder : Icon.Document}
            title={item.name}
            subtitle={item.path}
            accessories={[{ text: item.type }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
