import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, showInFinder, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ShortcutForm } from "./components/ShortcutForm";
import { createExportFile, writeExportFile } from "./lib/import-export";
import { getCustomShortcuts } from "./lib/storage";

export default function Command() {
  const [count, setCount] = useState<number | undefined>();
  const [lastExportPath, setLastExportPath] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  async function refreshCount() {
    setIsLoading(true);
    try {
      setCount((await getCustomShortcuts()).length);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not prepare export",
        message: error instanceof Error ? error.message : "Open Shortcut Vault again and retry.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshCount();
  }, []);

  async function exportToFile() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting shortcuts" });

    try {
      const result = await writeExportFile();
      setLastExportPath(result.filePath);
      setCount(result.count);
      toast.style = Toast.Style.Success;
      toast.title = "Export completed";
      toast.message = `${result.count} custom shortcut${result.count === 1 ? "" : "s"} exported`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : "Check local storage and retry.";
    }
  }

  async function copyExportJson() {
    try {
      const shortcuts = await getCustomShortcuts();
      await Clipboard.copy(JSON.stringify(createExportFile(shortcuts), null, 2));
      await showToast({
        style: Toast.Style.Success,
        title: "Export JSON copied",
        message: `${shortcuts.length} custom shortcut${shortcuts.length === 1 ? "" : "s"}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not copy export",
        message: error instanceof Error ? error.message : "Open Shortcut Vault again and retry.",
      });
    }
  }

  const hasShortcuts = Boolean(count);
  const markdown = hasShortcuts
    ? [
        "# Export Shortcuts",
        "",
        `Shortcut Vault will export **${count} custom shortcut${count === 1 ? "" : "s"}** as versioned JSON.`,
        "",
        "The exported file uses the official Shortcut Vault import/export format and can be imported back without changes.",
        "",
        lastExportPath ? `Last export: \`${lastExportPath}\`` : undefined,
      ]
        .filter(Boolean)
        .join("\n")
    : [
        "# Nothing to export",
        "",
        "Shortcut Vault only exports custom shortcuts. Add a custom shortcut first, then return here to create a JSON export.",
      ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {hasShortcuts ? (
            <ActionPanel.Section title="Export">
              <Action title="Export JSON" icon={Icon.Download} onAction={exportToFile} />
              <Action title="Copy Export JSON" icon={Icon.Clipboard} onAction={copyExportJson} />
              {lastExportPath ? (
                <Action
                  title="Show Export in Finder"
                  icon={Icon.Finder}
                  onAction={() => showInFinder(lastExportPath)}
                />
              ) : null}
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section title="Create">
              <Action.Push
                title="Add Shortcut"
                icon={Icon.Plus}
                target={<ShortcutForm onSaved={() => void refreshCount()} />}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
