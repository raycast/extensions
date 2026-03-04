import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useState } from "react";
import { useFileSelection, usePreview } from "./lib/hooks";
import { RenameRule } from "./lib/rules";
import AddRuleForm from "./components/AddRuleForm";
import fs from "fs";
import path from "path";

export default function AdvancedRenameCommand() {
  const { files, loading } = useFileSelection();
  const [rules, setRules] = useState<RenameRule[]>([]);
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
    const filesToRename = previewFiles.filter((f) => f.newName && f.newName !== path.basename(f.originalPath));

    if (filesToRename.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files to rename",
        message: "Add rules that change at least one filename.",
      });
      return;
    }

    if (
      await confirmAlert({
        title: `Rename ${filesToRename.length} files?`,
        primaryAction: { title: "Rename" },
      })
    ) {
      try {
        let successCount = 0;
        const errors: string[] = [];

        for (const file of filesToRename) {
          if (file.newName) {
            const oldPath = file.originalPath;
            const dir = path.dirname(oldPath);
            const newPath = path.join(dir, file.newName);

            if (fs.existsSync(newPath)) {
              errors.push(`Conflict: ${file.newName} already exists.`);
              continue;
            }

            const escapedFilePath = oldPath.replaceAll('"', '\\"');
            const escapedNewName = file.newName.replaceAll('"', '\\"');

            try {
              await runAppleScript(`
                tell application "Finder"
                  set theItem to POSIX file "${escapedFilePath}" as alias
                  set name of theItem to "${escapedNewName}"
                end tell
              `);
              successCount++;
            } catch (err) {
              errors.push(`Error renaming ${file.name}: ${(err as Error).message}`);
            }
          }
        }

        if (errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Completed with ${errors.length} errors`,
            message: errors[0] + (errors.length > 1 ? ` (and ${errors.length - 1} more)` : ""),
          });
        } else {
          await showToast({ style: Toast.Style.Success, title: `Successfully renamed ${successCount} files` });
          await closeMainWindow();
          await popToRoot();
        }
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rename Failed",
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  };

  return (
    <List isShowingDetail isLoading={loading}>
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
