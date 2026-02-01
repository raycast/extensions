/* eslint-disable */
import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getWorkflows, analyzeWorkflow } from "./utils/comfyui";
import { homedir } from "os";
import fs from "fs/promises";
import { existsSync } from "fs";

interface Preferences {
  workflowsPath: string;
}

interface Workflow {
  name: string;
  path: string;
  size?: number;
  modified?: Date;
  hasLoadImage?: boolean;
  hasPromptNode?: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    setIsLoading(true);
    try {
      const workflowsPath = preferences.workflowsPath.replace("~", homedir());

      if (!existsSync(workflowsPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Folder does not exist",
          message: `Create folder: ${workflowsPath}`,
        });
        setIsLoading(false);
        return;
      }

      const items = await getWorkflows(workflowsPath);

      // Získat dodatečné informace o každém workflow
      const enriched = await Promise.all(
        items.map(async (item) => {
          try {
            const stats = await fs.stat(item.path);
            const analysis = await analyzeWorkflow(item.path);

            return {
              ...item,
              size: stats.size,
              modified: stats.mtime,
              hasLoadImage: analysis.hasLoadImage,
              hasPromptNode: analysis.hasPromptNode,
            };
          } catch {
            return item;
          }
        }),
      );

      setWorkflows(enriched);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading workflows",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteWorkflow(workflow: Workflow) {
    const confirmed = await confirmAlert({
      title: "Delete workflow?",
      message: `Really delete ${workflow.name}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await fs.unlink(workflow.path);
        await showToast({
          style: Toast.Style.Success,
          title: "Workflow deleted",
        });
        await loadWorkflows();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error deleting",
          message: String(error),
        });
      }
    }
  }

  async function duplicateWorkflow(workflow: Workflow) {
    try {
      const content = await fs.readFile(workflow.path, "utf-8");
      const baseName = workflow.name.replace(".json", "");
      const newName = `${baseName}_copy.json`;
      const workflowsPath = preferences.workflowsPath.replace("~", homedir());
      const newPath = `${workflowsPath}/${newName}`;

      await fs.writeFile(newPath, content, "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: "Workflow duplicated",
        message: newName,
      });

      await loadWorkflows();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error duplicating",
        message: String(error),
      });
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "?";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(date?: Date): string {
    if (!date) return "?";
    return (
      date.toLocaleDateString("cs-CZ") + " " + date.toLocaleTimeString("cs-CZ")
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workflows...">
      {workflows.map((workflow) => (
        <List.Item
          key={workflow.path}
          title={workflow.name}
          subtitle={formatFileSize(workflow.size)}
          accessories={[
            {
              tag: {
                value: workflow.hasLoadImage ? "✓ LoadImage" : "✗ LoadImage",
                color: workflow.hasLoadImage ? Color.Green : Color.Red,
              },
            },
            {
              tag: {
                value: workflow.hasPromptNode ? "✓ Prompt" : "✗ Prompt",
                color: workflow.hasPromptNode ? Color.Green : Color.Yellow,
              },
            },
            {
              date: workflow.modified,
              tooltip: `Modified: ${formatDate(workflow.modified)}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenWith path={workflow.path} />
              <Action.ShowInFinder path={workflow.path} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={workflow.path}
              />
              <Action
                title="Duplicate"
                icon={Icon.Duplicate}
                onAction={() => duplicateWorkflow(workflow)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteWorkflow(workflow)}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
              />
              <Action
                title="Reload List"
                icon={Icon.ArrowClockwise}
                onAction={loadWorkflows}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Open Folder"
                icon={Icon.Folder}
                onAction={() =>
                  open(preferences.workflowsPath.replace("~", homedir()))
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {workflows.length === 0 && !isLoading && (
        <List.EmptyView
          title="No workflows"
          description={`Přidejte .json workflows do:\n${preferences.workflowsPath}`}
          icon={Icon.Document}
        />
      )}
    </List>
  );
}
