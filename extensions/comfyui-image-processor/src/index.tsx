/* eslint-disable */

import React from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  open,
  Clipboard,
  showHUD,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  processImages,
  getWorkflows,
  ensureServerRunning,
} from "./utils/comfyui";
import { homedir } from "os";

interface Preferences {
  serverUrl: string;
  haUrlInternal?: string;
  haUrlExternal?: string;
  haToken?: string;
  comfyuiSwitch?: string;
  outputSuffix: string;
  workflowsPath: string;
}

interface FormValues {
  images: string[];
  workflow: string;
  prompt?: string;
  useCustomPrompt: boolean;
  outputFolder?: string[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workflows, setWorkflows] = useState<{ name: string; path: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [hasImages, setHasImages] = useState(false);
  const [finderFiles, setFinderFiles] = useState<string[]>([]);

  useEffect(() => {
    loadWorkflows();
    loadRecentPrompts();
    loadFinderFiles();
  }, []);

  async function loadFinderFiles() {
    try {
      const items = await getSelectedFinderItems();
      const imagePaths = items.map((item) => item.path);
      if (imagePaths.length > 0) {
        setFinderFiles(imagePaths);
        setHasImages(true);
      }
    } catch (error) {
      // No selection is fine
    }
  }

  async function loadWorkflows() {
    try {
      const workflowsPath = preferences.workflowsPath.replace("~", homedir());
      const items = await getWorkflows(workflowsPath);
      setWorkflows(items);
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

  async function loadRecentPrompts() {
    const stored = await LocalStorage.getItem<string>("recent-prompts");
    if (stored) {
      setRecentPrompts(JSON.parse(stored));
    }
  }

  async function saveRecentPrompt(prompt: string) {
    const updated = [
      prompt,
      ...recentPrompts.filter((p) => p !== prompt),
    ].slice(0, 10);
    setRecentPrompts(updated);
    await LocalStorage.setItem("recent-prompts", JSON.stringify(updated));
  }

  async function handleSubmit(values: FormValues) {
    const imagesToProcess =
      finderFiles.length > 0 ? finderFiles : values.images || [];

    if (!values.useCustomPrompt && imagesToProcess.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select at least one image or use custom prompt",
      });
      return;
    }

    if (!values.workflow) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select a workflow",
      });
      return;
    }

    if (
      imagesToProcess.length === 0 &&
      (!values.outputFolder || values.outputFolder.length === 0)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select output folder for generated images",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking server...",
    });

    try {
      const serverRunning = await ensureServerRunning(
        preferences.serverUrl,
        preferences.haUrlInternal,
        preferences.haUrlExternal,
        preferences.haToken,
        preferences.comfyuiSwitch,
      );

      if (!serverRunning) {
        throw new Error("Server not available");
      }

      toast.title = "Processing...";

      const prompt =
        values.useCustomPrompt && values.prompt ? values.prompt : undefined;
      const outputFolder =
        values.outputFolder && values.outputFolder.length > 0
          ? values.outputFolder[0]
          : undefined;

      if (prompt) {
        await saveRecentPrompt(prompt);
      }

      if (imagesToProcess.length > 0) {
        toast.message = `0/${imagesToProcess.length}`;
      }

      const results = await processImages(
        preferences.serverUrl,
        values.workflow,
        imagesToProcess,
        preferences.outputSuffix,
        prompt,
        (current, total) => {
          if (total > 0) {
            toast.message = `${current}/${total}`;
          }
        },
        outputFolder,
      );

      toast.style = Toast.Style.Success;
      toast.title = `Done! Processed ${results.length} files`;
      toast.message = "Click to open folder";

      toast.primaryAction = {
        title: "Open Folder",
        onAction: async () => {
          if (results.length > 0) {
            const firstResult = results[0];
            const dir = firstResult.substring(0, firstResult.lastIndexOf("/"));
            await open(dir);
          }
        },
      };

      toast.secondaryAction = {
        title: "Copy Paths",
        onAction: async () => {
          await Clipboard.copy(results.join("\n"));
          await showHUD("Paths copied");
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Processing error";
      toast.message = String(error);
    }
  }

  const handleImagesChange = (files: string[]) => {
    if (finderFiles.length === 0) {
      setHasImages(files && files.length > 0);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Images" onSubmit={handleSubmit} />
          <Action
            title="Reload Workflows"
            onAction={loadWorkflows}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {finderFiles.length > 0 ? (
        <Form.Description
          title="Files from Finder"
          text={`Selected: ${finderFiles.length} file${finderFiles.length > 1 ? "s" : ""}`}
        />
      ) : (
        <>
          <Form.FilePicker
            id="images"
            title="Images (optional)"
            allowMultipleSelection={true}
            canChooseDirectories={false}
            canChooseFiles={true}
            onChange={handleImagesChange}
          />

          {!hasImages && (
            <Form.FilePicker
              id="outputFolder"
              title="Output Folder"
              allowMultipleSelection={false}
              canChooseDirectories={true}
              canChooseFiles={false}
            />
          )}
        </>
      )}

      <Form.Dropdown id="workflow" title="Workflow">
        {workflows.map((wf) => (
          <Form.Dropdown.Item key={wf.path} value={wf.path} title={wf.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        id="useCustomPrompt"
        label="Use custom prompt"
        value={useCustomPrompt}
        onChange={setUseCustomPrompt}
      />

      {useCustomPrompt && (
        <>
          <Form.TextArea
            id="prompt"
            title="Prompt"
            placeholder="Enter custom prompt for processing..."
          />

          {recentPrompts.length > 0 && (
            <Form.Dropdown id="recentPrompt" title="Recent Prompts" storeValue>
              <Form.Dropdown.Item value="" title="(select prompt)" />
              {recentPrompts.map((p, i) => (
                <Form.Dropdown.Item
                  key={i}
                  value={p}
                  title={p.length > 60 ? p.substring(0, 60) + "..." : p}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}

      <Form.Description
        title="Info"
        text={`Server: ${preferences.serverUrl}\nOutput suffix: ${preferences.outputSuffix}`}
      />
    </Form>
  );
}
