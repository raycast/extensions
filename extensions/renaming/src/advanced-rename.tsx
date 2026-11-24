import { Action, ActionPanel, Color, Icon, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { useMemo, useState } from "react";
import { useFileSelection, usePreview } from "./lib/hooks";
import { RenameRule } from "./lib/rules";
import AddRuleForm from "./components/AddRuleForm";
import { batchRename, checkConflicts } from "./lib/batch";
import { openRenameHistory, recordRenameHistory } from "./lib/history-nav";
import { filterByScope, itemNoun, type RenameScope } from "./lib/selection";
import { getUserFriendlyErrorMessage } from "./lib/errors";
import type { RenameOperation } from "./types";
import path from "path";

export default function AdvancedRenameCommand() {
  const { files: selection, loading } = useFileSelection();
  const [scope, setScope] = useState<RenameScope>("files");
  const [rules, setRules] = useState<RenameRule[]>([]);
  // The working set is the selection narrowed to the chosen scope, so the
  // preview below always lists exactly what "Apply Rename" will act on.
  const files = useMemo(() => filterByScope(selection, scope), [selection, scope]);
  const previewFiles = usePreview(files, rules);

  const addRule = (rule: RenameRule) => {
    setRules([...rules, rule]);
  };

  const updateRule = (updatedRule: RenameRule) => {
    setRules(rules.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    const newRules = [...rules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newRules.length) {
      [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
      setRules(newRules);
    }
  };

  const applyRename = async () => {
    // A non-empty selection that the scope filters down to nothing: say so
    // rather than reporting "no rules changed anything".
    if (selection.length > 0 && files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `No ${itemNoun(scope, 2)} in the selection`,
        message: `Select ${itemNoun(scope, 2)} in Finder, or change "Apply to".`,
      });
      return;
    }

    const filesToRename = previewFiles.filter((f) => f.newName && f.newName !== path.basename(f.originalPath));

    if (filesToRename.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `No ${itemNoun(scope, 2)} to rename`,
        message: `Add rules that change at least one ${itemNoun(scope, 1)} name.`,
      });
      return;
    }

    if (
      await confirmAlert({
        title: `Rename ${filesToRename.length} ${itemNoun(scope, filesToRename.length)}?`,
        primaryAction: { title: "Rename" },
      })
    ) {
      try {
        const operations: RenameOperation[] = filesToRename
          .filter((f) => f.newName)
          .map((file) => ({
            oldPath: file.originalPath,
            newName: file.newName!,
            newPath: path.join(path.dirname(file.originalPath), file.newName!),
          }));

        const conflicts = await checkConflicts(operations);
        if (conflicts.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Conflicts detected",
            message: conflicts[0],
          });
          return;
        }

        const results = await batchRename(operations);
        const successfulOps = results.filter((r) => r.success).map(({ oldPath, newPath }) => ({ oldPath, newPath }));
        const historySaved = await recordRenameHistory(
          `Advanced rename of ${successfulOps.length} ${itemNoun(scope, successfulOps.length)}`,
          successfulOps,
        );
        const successCount = successfulOps.length;
        const errors = results.filter((r) => !r.success).map((r) => `${path.basename(r.oldPath)}: ${r.error}`);

        if (errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Completed with ${errors.length} errors`,
            message: errors[0] + (errors.length > 1 ? ` (and ${errors.length - 1} more)` : ""),
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: `Successfully renamed ${successCount} ${itemNoun(scope, successCount)}`,
            // An empty batch records no history by design — only warn when
            // there was something to save and saving failed.
            message: successCount > 0 && !historySaved ? "History could not be saved" : undefined,
          });
          await openRenameHistory(historySaved);
        }
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rename Failed",
          message: getUserFriendlyErrorMessage(e),
        });
      }
    }
  };

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Apply to"
          value={scope}
          onChange={(newValue) => {
            if (newValue === "files" || newValue === "folders" || newValue === "both") {
              setScope(newValue);
            }
          }}
        >
          <List.Dropdown.Item title="Files" value="files" icon={Icon.Document} />
          <List.Dropdown.Item title="Folders" value="folders" icon={Icon.Folder} />
          <List.Dropdown.Item title="Files & Folders" value="both" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      <List.Section title="Active Rules">
        {rules.length === 0 && (
          <List.Item
            title="No rules added"
            subtitle="Add a rule to start renaming"
            icon={{ source: Icon.Plus, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action.Push title="Add Rule" icon={Icon.Plus} target={<AddRuleForm onAdd={addRule} />} />
              </ActionPanel>
            }
          />
        )}
        {rules.map((rule, index) => (
          <List.Item
            key={rule.id}
            title={rule.type.toUpperCase()}
            subtitle={`${Object.keys(rule.options).length} options`}
            icon={Icon.List}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Rule Type" text={rule.type.toUpperCase()} />
                    <List.Item.Detail.Metadata.Separator />
                    {Object.entries(rule.options).map(([key, value]) => (
                      <List.Item.Detail.Metadata.Label key={key} title={key} text={String(value)} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Rule"
                  icon={Icon.Pencil}
                  target={<AddRuleForm onAdd={updateRule} initialRule={rule} />}
                />
                <Action
                  title="Remove Rule"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeRule(rule.id)}
                />
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  onAction={() => moveRule(index, "up")}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  onAction={() => moveRule(index, "down")}
                />
                <Action.Push
                  title="Add Rule"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<AddRuleForm onAdd={addRule} />}
                />
                <Action title="Apply Rename" icon={Icon.Check} onAction={applyRename} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Preview">
        {previewFiles.map((file) => (
          <List.Item
            key={file.originalPath}
            title={file.newName || file.name}
            subtitle={file.name + file.extension}
            icon={file.isDirectory ? Icon.Folder : Icon.Document}
            accessories={
              file.newName && file.newName !== file.name + file.extension
                ? [{ text: "Will Rename", icon: { source: Icon.ArrowRight, tintColor: Color.Green } }]
                : []
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Original" text={file.name + file.extension} />
                    <List.Item.Detail.Metadata.Label title="New Name" text={file.newName || "-"} />
                    <List.Item.Detail.Metadata.Label title="Path" text={file.originalPath} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Rule"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<AddRuleForm onAdd={addRule} />}
                />
                <Action title="Apply Rename" icon={Icon.Check} onAction={applyRename} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
