import { ActionPanel, Action, List, Form, Icon, showHUD, popToRoot, useNavigation, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { ShelfItem, ExpressionRenameOptions, RenamePreview, RenamePreviewWithConflicts } from "./lib/types";
import {
  generateRenamePreviewWithConflicts,
  renameItems,
  validateSourceItems,
  ConflictStrategy,
} from "./lib/file-operations";
import { clearShelf, updateShelfItems, getShelfItems } from "./lib/shelf-storage";
import { keepShelfAfterCompletion } from "./lib/preferences";

interface RenameShelfProps {
  items?: ShelfItem[];
  onComplete?: () => Promise<void>;
}

function RenameConfirmation({
  previews,
  onConfirm,
  onBack,
}: {
  previews: RenamePreview[];
  onConfirm: () => void;
  onBack: () => void;
}) {
  const changedPreviews = previews.filter((p) => p.oldName !== p.newName);

  return (
    <List navigationTitle="Confirm Rename">
      <List.Section title={`${changedPreviews.length} file${changedPreviews.length !== 1 ? "s" : ""} will be renamed`}>
        <List.Item
          icon={Icon.CheckCircle}
          title="Apply Rename"
          subtitle="Rename files in their original locations"
          actions={
            <ActionPanel>
              <Action icon={Icon.Pencil} title="Apply Rename" onAction={onConfirm} />
              <Action icon={Icon.ArrowLeft} title="Go Back" onAction={onBack} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Preview">
        {previews.map((preview, index) => (
          <List.Item
            key={index}
            icon={preview.oldName !== preview.newName ? Icon.ArrowRight : Icon.Minus}
            title={preview.newName}
            subtitle={preview.oldName !== preview.newName ? `← ${preview.oldName}` : "No change"}
            accessories={[{ text: preview.item.type }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function RenameConflictResolution({
  conflicts,
  totalCount,
  onResolve,
  onBack,
}: {
  conflicts: RenamePreviewWithConflicts[];
  totalCount: number;
  onResolve: (strategy: ConflictStrategy) => void;
  onBack: () => void;
}) {
  const hasBatchConflicts = conflicts.some((preview) => preview.conflict === "duplicate_in_batch");
  const hasDirectoryConflicts = conflicts.some((preview) => preview.conflict === "exists_in_directory");

  const conflictSubtitle = (preview: RenamePreviewWithConflicts) => {
    if (preview.conflict === "duplicate_in_batch") {
      return "Duplicates another rename in this batch";
    }
    if (preview.conflict === "exists_in_directory") {
      return "A file with this name already exists";
    }
    return "Conflict detected";
  };

  return (
    <List navigationTitle="Resolve Rename Conflicts">
      <List.Section title={`${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""} found`}>
        <List.Item
          icon={{ source: Icon.Forward, tintColor: Color.Blue }}
          title="Skip Conflicts"
          subtitle="Only rename items without conflicts"
          accessories={[{ text: `${totalCount - conflicts.length} will rename` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Forward} title="Skip Conflicts" onAction={() => onResolve("skip")} />
              <Action icon={Icon.ArrowLeft} title="Go Back" onAction={onBack} />
            </ActionPanel>
          }
        />
        {hasDirectoryConflicts && !hasBatchConflicts ? (
          <List.Item
            icon={{ source: Icon.Replace, tintColor: Color.Orange }}
            title="Replace Conflicts"
            subtitle="Overwrite existing files with new names"
            accessories={[{ text: `${totalCount} will rename` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Replace}
                  title="Replace Conflicts"
                  style={Action.Style.Destructive}
                  onAction={() => onResolve("replace")}
                />
                <Action icon={Icon.ArrowLeft} title="Go Back" onAction={onBack} />
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
          title="Auto-Rename"
          subtitle="Keep all and add a suffix (e.g., file (1).txt)"
          accessories={[{ text: `${totalCount} will rename` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.PlusCircle} title="Auto-Rename" onAction={() => onResolve("rename")} />
              <Action icon={Icon.ArrowLeft} title="Go Back" onAction={onBack} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Conflicting Items">
        {conflicts.slice(0, 20).map((preview, index) => (
          <List.Item
            key={`conflict-${preview.item.id}-${index}`}
            icon={Icon.Warning}
            title={preview.newName}
            subtitle={conflictSubtitle(preview)}
            accessories={[{ text: preview.oldName }]}
          />
        ))}
        {conflicts.length > 20 && <List.Item icon={Icon.Ellipsis} title={`And ${conflicts.length - 20} more...`} />}
      </List.Section>
    </List>
  );
}

// Dynamic hint below expression input.
function getExpressionHelp(expression: string): string {
  const trimmed = expression.trim();
  const lastDollar = trimmed.lastIndexOf("$");
  const token = lastDollar === -1 ? "" : trimmed.slice(lastDollar);

  if (token.startsWith("$n")) {
    return "$nn$ padded · $n-$ descending · $n:10$ start at 10";
  }
  if (token.startsWith("$d")) {
    return "$d:format$ custom · $d:f$ file date";
  }
  if (token.startsWith("$t")) {
    return "$t:format$ custom · $t:f$ file time";
  }
  if (token.startsWith("$f")) {
    return "$f$ filename";
  }

  return "$f$ filename · $n$ numbering · $d$ date · $t$ time";
}

export default function RenameShelf({ items: propItems, onComplete }: RenameShelfProps) {
  const { push, pop } = useNavigation();
  const [items, setItems] = useState<ShelfItem[]>(propItems || []);
  const [isLoading, setIsLoading] = useState(!propItems);
  const [staleResolved, setStaleResolved] = useState(false);
  const [expression, setExpression] = useState("$f$");
  const [matchPattern, setMatchPattern] = useState("");

  useEffect(() => {
    if (!propItems) {
      getShelfItems().then((shelfItems) => {
        setItems(shelfItems);
        setIsLoading(false);
      });
    }
  }, [propItems]);

  const options: ExpressionRenameOptions = useMemo(
    () => ({
      expression,
      matchPattern: matchPattern || undefined,
    }),
    [expression, matchPattern],
  );

  const validation = useMemo(() => validateSourceItems(items), [items]);
  const staleItems = validation.stale;

  const previews = useMemo(() => generateRenamePreviewWithConflicts(items, options), [items, options]);
  const conflicts = useMemo(() => previews.filter((preview) => preview.conflict), [previews]);

  // Dynamic help description based on expression
  const expressionHelp = useMemo(() => getExpressionHelp(expression), [expression]);

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
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.XMarkCircle}
            title="Cancel"
            subtitle="Go back without renaming"
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

  const handleConfirm = async (onConflict: ConflictStrategy = "skip") => {
    const results = renameItems(previews, onConflict);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    const fullySuccessful = failCount === 0;

    if (fullySuccessful && !keepShelfAfterCompletion()) {
      await clearShelf();
    } else {
      const updatedItems = items.map((item, index) => {
        const result = results[index];
        if (result.success && result.newPath) {
          const newName = previews[index].newName;
          return { ...item, name: newName, path: result.newPath };
        }
        return item;
      });
      await updateShelfItems(updatedItems);
    }

    if (onComplete) {
      await onComplete();
    }

    if (failCount > 0) {
      await showHUD(`Renamed ${successCount} item${successCount !== 1 ? "s" : ""}, ${failCount} failed`);
    } else {
      await showHUD(`Renamed ${successCount} item${successCount !== 1 ? "s" : ""}`);
    }

    await popToRoot();
  };

  const handleReview = () => {
    if (conflicts.length > 0) {
      push(
        <RenameConflictResolution
          conflicts={conflicts}
          totalCount={previews.length}
          onResolve={handleConfirm}
          onBack={pop}
        />,
      );
    } else {
      push(<RenameConfirmation previews={previews} onConfirm={() => handleConfirm("skip")} onBack={pop} />);
    }
  };

  return (
    <Form
      navigationTitle="Rename Items"
      actions={
        <ActionPanel>
          <Action icon={Icon.Eye} title="Review Changes" onAction={handleReview} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="expression"
        title={matchPattern.trim() ? "Replace with" : "Rename to"}
        placeholder="e.g., prefix_$nnn$_$f$_$d:YYYY-MM-DD$"
        //value={expression}
        onChange={setExpression}
        info="Combine expressions to create custom rename patterns."
        autoFocus
      />

      <Form.Description title="" text={expressionHelp} />

      <Form.TextField
        id="match"
        title="Match"
        placeholder="Optional: pattern to match"
        value={matchPattern}
        onChange={setMatchPattern}
        info="If provided, the rename expression will only be applied to the matched portion of the filename. Leave empty to rename the whole filename."
      />

      <Form.Separator />

      {previews.slice(0, 1).map((preview, index) => (
        <Form.Description key={index} title={`Live Preview (${previews.length} items)`} text={preview.newName} />
      ))}
      {previews.slice(1, 20).map((preview, index) => (
        <Form.Description key={index} text={preview.newName} />
      ))}
      {previews.length > 20 && <Form.Description title="" text={`... and ${previews.length - 20} more items`} />}
    </Form>
  );
}
